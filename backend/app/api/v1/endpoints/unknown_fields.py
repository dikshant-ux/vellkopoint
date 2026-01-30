from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel
from app.models.unknown_field import UnknownField
from app.services.unknown_field_service import UnknownFieldService
from app.api import deps
from fastapi import APIRouter, HTTPException, Depends, Request
from app.models.user import User
from app.core.permissions import Permission


router = APIRouter()

class MapFieldRequest(BaseModel):
    source_id: str
    vendor_field_name: str
    target_system_field: str
    is_new_system_field: bool = False
    new_field_data: Optional[dict] = None

@router.get("/", response_model=List[UnknownField])
async def list_unknown_fields(
    request: Request,
    source_id: Optional[str] = None,
    current_user: User = Depends(deps.require_permission(Permission.VIEW_SYSTEM_FIELDS))
):
    criteria = [
        UnknownField.status == "unmapped"
    ]
    # Return all fields for the user's tenant
    criteria.append(UnknownField.tenant_id == current_user.tenant_id)
        
    if source_id:
        criteria.append(UnknownField.source_id == source_id)
        
    return await UnknownField.find(*criteria).sort("-last_seen").to_list(None)

@router.post("/map")
async def map_unknown_field(
    payload: MapFieldRequest,
    current_user: User = Depends(deps.require_permission(Permission.EDIT_SYSTEM_FIELDS))
):
    try:
        result = await UnknownFieldService.map_unknown_field(
            source_id=payload.source_id,
            vendor_field_name=payload.vendor_field_name,
            target_system_field=payload.target_system_field,
            owner_id=str(current_user.id),
            tenant_id=current_user.tenant_id,
            is_new_system_field=payload.is_new_system_field,
            new_field_data=payload.new_field_data
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
