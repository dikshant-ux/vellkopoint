from fastapi import APIRouter, HTTPException, Depends, Request, Response
from typing import List, Optional
from app.models.system_field import SystemField, AliasEntry
from app.api import deps
from app.core.permissions import Permission
from app.api import deps
from app.models.user import User
from app.core.roles import Role
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class SystemFieldCreate(BaseModel):
    field_key: str
    label: str
    data_type: str = "string"
    category: str = "general"
    description: Optional[str] = None
    is_required: bool = False
    aliases: List[AliasEntry] = []

@router.get("/", response_model=List[SystemField])
async def list_system_fields(
    request: Request,
    response: Response,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_SYSTEM_FIELDS))
):
    # Public Cache Control
    response.headers["Cache-Control"] = "public, max-age=60"
    
    # If Owner/Super Admin, return all fields. Else filter by owner.
    # Return all fields for the user's tenant
    return await SystemField.find(SystemField.tenant_id == current_user.tenant_id).to_list(None)

@router.post("/", response_model=SystemField)
async def create_system_field(
    payload: SystemFieldCreate,
    current_user: User = Depends(deps.require_permission(Permission.CREATE_SYSTEM_FIELDS))
):
    # If owner, check globally/broadly? Or just ensuring uniqueness?
    # For now, enforce uniqueness within the owner_id context (or globally if owner?)
    # A safe bet is to check if Key exists for THIS user's scope. 
    # But if Owner creates it, owner_id is set to Owner.
    
    # Check if exists for this tenant
    exists = await SystemField.find_one(
        SystemField.field_key == payload.field_key,
        SystemField.tenant_id == current_user.tenant_id
    )
    if exists:
        raise HTTPException(status_code=400, detail="System field with this key already exists for your account")
    
    field = SystemField(
        **payload.dict(),
        owner_id=str(current_user.id),
        tenant_id=current_user.tenant_id
    )
    await field.insert()
    return field

@router.put("/{field_key}", response_model=SystemField)
async def update_system_field(
    field_key: str, 
    payload: SystemFieldCreate,
    current_user: User = Depends(deps.require_permission(Permission.EDIT_SYSTEM_FIELDS))
):
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🔄 Updating system field: {field_key} for user {current_user.id}")
    logger.debug(f"Payload: {payload.dict()}")
    
    query = [SystemField.field_key == field_key]
    if current_user.role not in [Role.OWNER, Role.SUPER_ADMIN]:
        query.append(SystemField.owner_id == str(current_user.id))

    field = await SystemField.find_one(*query)
    if not field:
        logger.error(f"❌ System field not found: {field_key}")
        raise HTTPException(status_code=404, detail="System field not found")
    
    logger.debug(f"Found field: {field.field_key}, current aliases: {len(field.aliases)}")
    
    field.label = payload.label
    field.data_type = payload.data_type
    field.category = payload.category
    field.description = payload.description
    field.is_required = payload.is_required
    field.aliases = payload.aliases
    field.updated_at = datetime.utcnow()
    
    logger.debug(f"Updated field, new aliases: {len(payload.aliases)}")
    
    await field.save()
    logger.info(f"✅ System field saved: {field_key}")
    
    return field

@router.delete("/{field_key}")
async def delete_system_field(
    field_key: str,
    current_user: User = Depends(deps.require_permission(Permission.DELETE_SYSTEM_FIELDS))
):
    field = await SystemField.find_one(
        SystemField.field_key == field_key,
        SystemField.tenant_id == current_user.tenant_id
    )
    if not field:
        raise HTTPException(status_code=404, detail="System field not found")
    
    await field.delete()
    return {"message": "Field deleted"}
