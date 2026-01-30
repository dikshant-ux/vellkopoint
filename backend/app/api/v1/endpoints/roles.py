from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from app.models.role import Role
from app.models.user import User
from beanie import PydanticObjectId
from pydantic import BaseModel
from datetime import datetime
from app.api import deps
from app.core.roles import Role as RoleConstants

router = APIRouter()

# --------------------------
# MODELS
# --------------------------

class RoleModel(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: List[str] # Flat list e.g., "leads:read"

class RoleResponse(BaseModel):
    id: str
    name: str
    description: str
    permissions: List[str]
    is_system: bool
    user_count: int = 0
    created_at: datetime

# --------------------------
# DEPENDENCIES
# --------------------------
async def require_role_admin(current_user: User = Depends(deps.get_current_user)):
    """
    Check if user is a Super Admin, Owner OR has roles:write permission.
    """
    if current_user.role in [RoleConstants.SUPER_ADMIN, RoleConstants.OWNER]:
        return current_user
         
    # Check custom role permissions if applicable
    if current_user.role_id:
        role = await Role.get(current_user.role_id)
        if role and (role.name == "Admin" or "roles:write" in role.permissions):
            return current_user

    raise HTTPException(status_code=403, detail="Account administrators only")


# --------------------------
# ROUTES
# --------------------------

@router.get("/", response_model=List[RoleResponse])
async def list_roles(current_user: User = Depends(deps.get_current_user)):
    roles = await Role.find(Role.tenant_id == current_user.tenant_id).to_list()
    
    # Auto-seed default roles if they don't exist
    from app.core.roles import Role as RoleConstants, get_role_permissions
    
    # Check for Admin role
    admin_role = next((r for r in roles if r.name == "Admin"), None)
    if not admin_role:
        admin_role = Role(
            name="Admin",
            tenant_id=current_user.tenant_id,
            description="Default Admin Role",
            permissions=get_role_permissions(RoleConstants.ADMIN),
            is_system=True
        )
        await admin_role.create()
        roles.append(admin_role)
        
    # Check for User role
    user_role = next((r for r in roles if r.name == "User"), None)
    if not user_role:
        user_role = Role(
            name="User",
            tenant_id=current_user.tenant_id,
            description="Default User Role",
            permissions=get_role_permissions(RoleConstants.USER),
            is_system=True
        )
        await user_role.create()
        roles.append(user_role)

    # Sort: Admin, User, then others
    def role_sort_key(r):
        if r.name == "Admin": return 0
        if r.name == "User": return 1
        return 2
    
    roles.sort(key=role_sort_key)
    
    result = []
    for r in roles:
        # Count users in this role
        count = await User.find(User.role_id == str(r.id)).count()
        
        result.append(RoleResponse(
            id=str(r.id),
            name=r.name,
            description=r.description,
            permissions=r.permissions,
            is_system=r.is_system,
            user_count=count,
            created_at=r.created_at
        ))
    return result

@router.post("/", response_model=RoleResponse)
async def create_role(role_in: RoleModel, current_user: User = Depends(require_role_admin)):
    # Check if name exists in account
    existing = await Role.find_one(Role.name == role_in.name, Role.tenant_id == current_user.tenant_id)
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists for this account")
        
    new_role = Role(
        name=role_in.name,
        tenant_id=current_user.tenant_id,
        description=role_in.description,
        permissions=role_in.permissions,
        is_system=False
    )
    
    await new_role.create()
    
    return RoleResponse(
        id=str(new_role.id),
        name=new_role.name,
        description=new_role.description,
        permissions=new_role.permissions,
        is_system=new_role.is_system,
        user_count=0,
        created_at=new_role.created_at
    )

@router.get("/{id}", response_model=RoleResponse)
async def get_role(id: str, current_user: User = Depends(deps.get_current_user)):
    try:
        role_oid = PydanticObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    r = await Role.find_one(Role.id == role_oid, Role.tenant_id == current_user.tenant_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
        
    count = await User.find(User.role_id == str(r.id)).count()
    
    return RoleResponse(
        id=str(r.id),
        name=r.name,
        description=r.description,
        permissions=r.permissions,
        is_system=r.is_system,
        user_count=count,
        created_at=r.created_at
    )

@router.put("/{id}", response_model=dict)
async def update_role(id: str, role_data: RoleModel, current_user: User = Depends(require_role_admin)):
    try:
        role_oid = PydanticObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    existing = await Role.find_one(Role.id == role_oid, Role.tenant_id == current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
        
    if existing.is_system and existing.name != role_data.name:
         raise HTTPException(status_code=400, detail="Cannot rename system roles")

    existing.name = role_data.name
    existing.description = role_data.description
    existing.permissions = role_data.permissions
    existing.updated_at = datetime.utcnow()
    
    await existing.save()
    
    return {"message": "Role updated"}

@router.delete("/{id}", response_model=dict)
async def delete_role(id: str, current_user: User = Depends(require_role_admin)):
    try:
        role_oid = PydanticObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    existing = await Role.find_one(Role.id == role_oid, Role.tenant_id == current_user.tenant_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
        
    if existing.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
        
    # Check usage
    user_count = await User.find(User.role_id == str(existing.id)).count()
    if user_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete role assigned to users. Reassign them first.")
        
    await existing.delete()
    
    return {"message": "Role deleted"}
