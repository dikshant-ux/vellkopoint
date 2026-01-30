from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.models.role import Role as RoleDocument
from app.core.roles import has_permission, is_admin, is_owner, Role as RoleConstants

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(token: str = Depends(reusable_oauth2)) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = payload.get("sub")
        if token_data is None:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = await User.get(token_data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Determine permissions
    from app.core.roles import get_role_permissions
    
    all_perms = set()
    
    # If user has a dynamic custom role, that takes precedence (Strict Mode)
    if user.role_id:
        role_doc = await RoleDocument.get(user.role_id)
        if role_doc:
            all_perms.update(role_doc.permissions)
        else:
            # Fallback if role not found (shouldn't happen often, but safe fallback to base role)
            all_perms.update(get_role_permissions(user.role))
    else:
        # Standard base role
        all_perms.update(get_role_permissions(user.role))
            
    # Dynamically attach permissions for the request lifecycle
    user.permissions = list(all_perms)
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if not current_user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    return current_user


# RBAC Permission Dependencies

def require_permission(permission: str):
    """
    Dependency factory to check if user has a specific permission.
    
    Usage:
        @router.get("/vendors/")
        async def list_vendors(user: User = Depends(require_permission(Permission.VIEW_VENDORS))):
            ...
    """
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # 1. Check hardcoded roles
        if has_permission(current_user.role, current_user.permissions, permission):
            return current_user
            
        # 2. Check dynamic role if present
        if current_user.role_id:
            role = await RoleDocument.get(current_user.role_id)
            if role and permission in role.permissions:
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required permission: {permission}"
        )
    return permission_checker


def require_role(required_role: str):
    """
    Dependency factory to check if user has a specific role.
    
    Usage:
        @router.post("/users/invite")
        async def invite_user(user: User = Depends(require_role(Role.ADMIN))):
            ...
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        return current_user
    return role_checker


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to check if user is an admin or super admin.
    
    Usage:
        @router.post("/destinations/{id}/approve")
        async def approve_destination(user: User = Depends(require_admin)):
            ...
    """
    # 1. Check hardcoded roles (Super Admin / Owner always pass)
    if is_admin(current_user.role):
        return current_user
        
    # 2. Check dynamic role permissions
    # Since get_current_user already populates current_user.permissions with the correct role permissions
    # we can just check for key admin capabilities.
    admin_permissions = ["roles:write", "manage_users", "view_analytics"]
    if any(p in current_user.permissions for p in admin_permissions):
        return current_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required"
    )


async def require_owner(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to check if user is an owner.
    
    Usage:
        @router.delete("/users/{id}")
        async def delete_user(user: User = Depends(require_owner)):
            ...
    """
    if not is_owner(current_user.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required"
        )
    return current_user


# Alias for backward compatibility
get_current_admin_user = require_admin
