from fastapi import APIRouter, Depends
from typing import Dict, List
from app.models.user import User
from app.api import deps
from app.core.permissions import Permission

router = APIRouter()

@router.get("/", response_model=Dict[str, List[str]])
async def list_permissions(
    current_user: User = Depends(deps.get_current_user)
):
    """
    List all available system permissions grouped by category.
    Used for dynamic role creation UI.
    """
    return {
        "Vendors": [
            Permission.VIEW_VENDORS,
            Permission.CREATE_VENDORS,
            Permission.EDIT_VENDORS,
            Permission.DELETE_VENDORS,
        ],
        "Sources": [
            Permission.VIEW_SOURCES,
            Permission.CREATE_SOURCES,
            Permission.EDIT_SOURCES,
            Permission.DELETE_SOURCES,
        ],
        "Leads": [
            Permission.VIEW_LEADS,
            Permission.VIEW_FULL_LEADS, # Controls masking (If present -> Unmasked)
            Permission.EXPORT_LEADS,
            Permission.DELETE_LEADS,
        ],
        "Customers": [
            Permission.VIEW_CUSTOMERS,
            Permission.CREATE_CUSTOMERS,
            Permission.EDIT_CUSTOMERS,
            Permission.DELETE_CUSTOMERS,
        ],
        "Destinations": [
            Permission.VIEW_DESTINATIONS,
            Permission.CREATE_DESTINATIONS,
            Permission.EDIT_DESTINATIONS,
            Permission.DELETE_DESTINATIONS,
            Permission.APPROVE_DESTINATIONS,
        ],
        "Campaigns": [
            Permission.VIEW_CAMPAIGNS,
            Permission.CREATE_CAMPAIGNS,
            Permission.EDIT_CAMPAIGNS,
            Permission.DELETE_CAMPAIGNS,
        ],
        "System Fields": [
            Permission.VIEW_SYSTEM_FIELDS,
            Permission.CREATE_SYSTEM_FIELDS,
            Permission.EDIT_SYSTEM_FIELDS,
            Permission.DELETE_SYSTEM_FIELDS,
        ],
        "Users": [
            Permission.VIEW_USERS,
            Permission.INVITE_USERS,
            Permission.MANAGE_USERS,
            Permission.DELETE_USERS,
        ],
        "Analytics": [
            Permission.VIEW_ANALYTICS,
            Permission.EXPORT_REPORTS,
        ],
        "Roles": [
            Permission.VIEW_ROLES,
            Permission.CREATE_ROLES,
            # Permission.EDIT_ROLES, # Duplicate of CREATE_ROLES (roles:write)
            Permission.DELETE_ROLES,
        ],
        "Settings": [
            Permission.MANAGE_SETTINGS,
        ]
    }
