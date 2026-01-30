"""
User management endpoints for RBAC system.
Handles user invitations, role management, and user administration.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from app.models.user import User
from app.api import deps
from app.core.permissions import Permission
from app.core.roles import Role, get_role_permissions
from app.core.security import get_password_hash, create_access_token
import secrets
import logging
from app.utils.cache import invalidate_cache
from app.models.role import Role as RoleDocument
from beanie import PydanticObjectId

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models

class UserInvite(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "user"
    role_id: Optional[str] = None


class UserInviteResponse(BaseModel):
    message: str
    invitation_token: str
    expires_at: datetime


class AcceptInvitation(BaseModel):
    token: str
    password: str
    full_name: Optional[str] = None


class UpdateUserRole(BaseModel):
    role: str
    role_id: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    role_id: Optional[str]
    permissions: List[str]
    is_active: bool
    is_verified: bool
    invited_by: Optional[str]
    created_at: datetime


# Endpoints

@router.post("/invite", response_model=UserInviteResponse)
async def invite_user(
    payload: UserInvite,
    current_user: User = Depends(deps.require_admin)
):
    """
    Invite a new user to the platform (Admin/Owner only).
    Sends an email invitation with a secure token.
    """
    # Check if user already exists
    existing_user = await User.find_one(User.email == payload.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    
    # Validate role
    # If role_id is provided, validate it exists
    if payload.role_id:
        role_doc = await RoleDocument.get(payload.role_id)
        if not role_doc:
            raise HTTPException(status_code=400, detail="Invalid role ID")
        # For dynamic roles, we can use "user" as the base role or "custom"
        # but let's stick to "user" for now as the fallback
        payload.role = Role.USER 
    elif payload.role not in [Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.USER]:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {Role.SUPER_ADMIN}, {Role.OWNER}, {Role.ADMIN}, {Role.USER}")
    
    # Only owner can create other owners (or maybe restrict to 1 owner per tenant?)
    if payload.role == Role.OWNER and current_user.role != Role.OWNER:
         raise HTTPException(status_code=403, detail="Only owners can invite other owners")

    # Generate secure invitation token
    invitation_token = secrets.token_urlsafe(32)
    invitation_expires = datetime.utcnow() + timedelta(hours=24)
    
    # Create user with pending status
    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password="",  # Will be set when invitation is accepted
        role=payload.role,
        role_id=payload.role_id,
        invited_by=str(current_user.id),
        tenant_id=current_user.tenant_id,  # Assign to inviter's tenant
        invitation_token=invitation_token,
        invitation_expires=invitation_expires,
        is_active=False,  # Activated when invitation is accepted
        is_verified=False
    )
    
    await new_user.insert()
    
    # Send invitation email (background task)
    # Send invitation email (Celery task)
    from app.services.email_service import send_invitation_email
    await send_invitation_email(
        email=payload.email,
        full_name=payload.full_name,
        invitation_token=invitation_token,
        invited_by=current_user.full_name or current_user.email,
        role=payload.role
    )
    
    logger.info(f"User invited: {payload.email} by {current_user.email} with role {payload.role}")
    
    return UserInviteResponse(
        message="Invitation sent successfully",
        invitation_token=invitation_token,
        expires_at=invitation_expires
    )


@router.get("/validate-invitation")
async def validate_invitation(token: str):
    """
    Validate an invitation token.
    Returns user info if valid.
    """
    user = await User.find_one(User.invitation_token == token)
    
    if not user:
        raise HTTPException(status_code=404, detail="Invalid invitation token")
    
    if user.invitation_expires and user.invitation_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invitation token has expired")
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="Invitation already accepted")
    
    return {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }


@router.post("/accept-invitation")
async def accept_invitation(payload: AcceptInvitation):
    """
    Accept a user invitation and set password.
    Activates the user account.
    """
    # Find user by invitation token
    user = await User.find_one(User.invitation_token == payload.token)
    
    if not user:
        raise HTTPException(status_code=404, detail="Invalid invitation token")
    
    # Check if token has expired
    if user.invitation_expires and user.invitation_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invitation token has expired")
    
    # Check if already activated
    if user.is_active:
        raise HTTPException(status_code=400, detail="Invitation already accepted")
    
    # Set password and activate account
    user.hashed_password = get_password_hash(payload.password)
    if payload.full_name:
        user.full_name = payload.full_name
    user.is_active = True
    user.is_verified = True
    user.invitation_token = None  # Clear token
    user.invitation_expires = None
    user.updated_at = datetime.utcnow()
    
    await user.save()
    
    logger.info(f"User accepted invitation: {user.email}")
    
    # Generate access token
    access_token = create_access_token(subject=str(user.id))
    
    return {
        "message": "Invitation accepted successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


async def _to_user_response(user: User) -> UserResponse:
    """Helper to convert User and Role to UserResponse with merged permissions."""
    from app.core.roles import get_role_permissions
    
    all_perms = set(get_role_permissions(user.role))
    if user.role_id:
        role_doc = await RoleDocument.get(user.role_id)
        if role_doc:
            all_perms.update(role_doc.permissions)
            
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        role_id=user.role_id,
        permissions=list(all_perms),
        is_active=user.is_active,
        is_verified=user.is_verified,
        invited_by=user.invited_by,
        created_at=user.created_at
    )


@router.get("/", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(deps.require_admin)
):
    """
    List all users in the current tenant (Admin only).
    """
    users = await User.find(User.tenant_id == current_user.tenant_id).to_list()
    
    return [await _to_user_response(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(deps.require_admin)
):
    """
    Get user details by ID within tenant (Admin only).
    """
    user = await User.find_one(User.id == PydanticObjectId(user_id), User.tenant_id == current_user.tenant_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return await _to_user_response(user)


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    payload: UpdateUserRole,
    current_user: User = Depends(deps.require_admin)
):
    """
    Update user's role and permissions (Owner/Super Admin only).
    Only super admin can modify super admin roles.
    """
    user = await User.get(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only Owner or Super Admin can update roles
    if current_user.role not in [Role.OWNER, Role.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only Owners can manage user roles")
    
    # Validate role
    if payload.role_id:
        role_doc = await RoleDocument.get(payload.role_id)
        if not role_doc:
            raise HTTPException(status_code=400, detail="Invalid role ID")
        payload.role = Role.USER # Fallback
    elif payload.role not in [Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.USER]:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {Role.SUPER_ADMIN}, {Role.OWNER}, {Role.ADMIN}, {Role.USER}")
    
    # Only owner can promote to owner
    if payload.role == Role.OWNER and current_user.role != Role.OWNER:
        raise HTTPException(status_code=403, detail="Only owners can assign the owner role")
    
    # Only super admin can modify super admin roles
    if (user.role == Role.SUPER_ADMIN or payload.role == Role.SUPER_ADMIN) and current_user.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admins can modify super admin roles")

    # Prevent modifying owner role
    if user.role == Role.OWNER:
        raise HTTPException(status_code=403, detail="Cannot modify owner role")
    
    # Cannot modify own role
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot modify your own role")
    
    # Update role
    user.role = payload.role
    user.role_id = payload.role_id
    user.updated_at = datetime.utcnow()
    
    await user.save()
    await invalidate_cache(f"fastapi-cache:{user.id}:/api/v1/auth/me")
    
    logger.info(f"User role updated: {user.email} -> {payload.role} by {current_user.email}")
    
    return await _to_user_response(user)


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(deps.require_admin)
):
    """
    Deactivate a user account (Owner/Super Admin only).
    Super admin accounts can only be deactivated by other super admins.
    """
    user = await User.get(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only Owner or Super Admin can deactivate users
    if current_user.role not in [Role.OWNER, Role.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only Owners can deactivate users")
    
    # Only super admin can deactivate super admin accounts
    if user.role == Role.SUPER_ADMIN and current_user.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admins can deactivate super admin accounts")

    # Prevent deactivating owner account
    if user.role == Role.OWNER:
        raise HTTPException(status_code=403, detail="Cannot deactivate owner account")
    
    # Cannot deactivate own account
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    # Deactivate user
    user.is_active = False
    user.updated_at = datetime.utcnow()
    
    await user.save()
    await invalidate_cache(f"fastapi-cache:{user.id}:/api/v1/auth/me")
    
    logger.info(f"User deactivated: {user.email} by {current_user.email}")
    
    return {"message": "User deactivated successfully"}


@router.post("/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    current_user: User = Depends(deps.require_admin)
):
    """
    Reactivate a deactivated user account (Owner/Super Admin only).
    """
    user = await User.get(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only Owner or Super Admin can reactivate users
    if current_user.role not in [Role.OWNER, Role.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only Owners can reactivate users")
    
    if user.is_active:
        raise HTTPException(status_code=400, detail="User is already active")
    
    # Reactivate user
    user.is_active = True
    user.updated_at = datetime.utcnow()
    
    await user.save()
    await invalidate_cache(f"fastapi-cache:{user.id}:/api/v1/auth/me")
    
    logger.info(f"User reactivated: {user.email} by {current_user.email}")
    
    return {"message": "User reactivated successfully"}


@router.delete("/{user_id}/permanent")
async def delete_user_permanently(
    user_id: str,
    current_user: User = Depends(deps.require_admin)
):
    """
    Permanently delete a user account (Owner/Super Admin only).
    This action cannot be undone.
    """
    user = await User.get(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only Owner or Super Admin can delete users
    if current_user.role not in [Role.OWNER, Role.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only Owners can permanently delete users")
    
    # Only super admin can delete super admin accounts
    if user.role == Role.SUPER_ADMIN and current_user.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admins can delete super admin accounts")

    # Prevent deleting owner account
    if user.role == Role.OWNER:
        raise HTTPException(status_code=403, detail="Cannot delete owner account")
    
    # Cannot delete own account
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check if user has related records that prevent deletion?
    # For now, we assume cascading delete or manual cleanup is not required by Beanie unless configured
    # Ideally we should clean up related Invite/Session/etc if they exist
    
    await user.delete()
    await invalidate_cache(f"fastapi-cache:{user.id}:/api/v1/auth/me")
    
    logger.info(f"User permanently deleted: {user.email} by {current_user.email}")
    
    return {"message": "User permanently deleted"}


# Helper Functions


