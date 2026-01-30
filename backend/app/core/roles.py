"""
Role definitions and role-permission mappings for RBAC system.
"""

from typing import List
from app.core.permissions import Permission, ALL_PERMISSIONS


class Role:
    """Role constants"""
    SUPER_ADMIN = "super_admin"
    OWNER = "owner"
    ADMIN = "admin"
    USER = "user"


# Role-Permission Mappings
ROLE_PERMISSIONS = {
    # Super Admin/Owner: Full access to tenant data
    Role.SUPER_ADMIN: ALL_PERMISSIONS,
    Role.OWNER: ALL_PERMISSIONS,
    
    # Admin: High access, can manage users/destinations
    Role.ADMIN: [
        # Vendors & Sources - Full access
        Permission.VIEW_VENDORS,
        Permission.CREATE_VENDORS,
        Permission.EDIT_VENDORS,
        Permission.DELETE_VENDORS,
        Permission.VIEW_SOURCES,
        Permission.CREATE_SOURCES,
        Permission.EDIT_SOURCES,
        Permission.DELETE_SOURCES,
        
        # Leads - Full access including unmasked data
        Permission.VIEW_LEADS,
        Permission.VIEW_FULL_LEADS,  # Can see unmasked data
        Permission.EXPORT_LEADS,
        Permission.DELETE_LEADS,
        
        # Customers & Destinations - Full access
        Permission.VIEW_CUSTOMERS,
        Permission.CREATE_CUSTOMERS,
        Permission.EDIT_CUSTOMERS,
        Permission.DELETE_CUSTOMERS,
        Permission.VIEW_DESTINATIONS,
        Permission.CREATE_DESTINATIONS,
        Permission.EDIT_DESTINATIONS,
        Permission.DELETE_DESTINATIONS,
        Permission.APPROVE_DESTINATIONS,
        
        # Campaigns - Full access
        Permission.VIEW_CAMPAIGNS,
        Permission.CREATE_CAMPAIGNS,
        Permission.EDIT_CAMPAIGNS,
        Permission.DELETE_CAMPAIGNS,
        
        # System Fields - Full access
        Permission.VIEW_SYSTEM_FIELDS,
        Permission.CREATE_SYSTEM_FIELDS,
        Permission.EDIT_SYSTEM_FIELDS,
        Permission.DELETE_SYSTEM_FIELDS,
        
        # Users - Can invite and view
        Permission.INVITE_USERS,
        # Permission.MANAGE_USERS, # Only Owner/Super Admin can manage users (roles, activation)
        # Permission.DELETE_USERS, # Only Owner/Super Admin can delete users
        
        # Analytics - Full access
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_REPORTS,
        
        # Settings
        Permission.MANAGE_SETTINGS,
    ],
    
    # User: Limited access
    Role.USER: [
        Permission.VIEW_VENDORS,
        Permission.VIEW_SOURCES,
        Permission.VIEW_LEADS,  # Masked only
        Permission.VIEW_CUSTOMERS,
        Permission.VIEW_DESTINATIONS,
        Permission.CREATE_DESTINATIONS,  # Needs approval
        Permission.VIEW_CAMPAIGNS,
        Permission.VIEW_SYSTEM_FIELDS,
        Permission.VIEW_ANALYTICS,
    ],
}


def get_role_permissions(role: str) -> List[str]:
    """Get list of permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(user_role: str, user_permissions: List[str], required_permission: str) -> bool:
    """Check if a user has a specific permission."""
    return required_permission in user_permissions


def is_admin(user_role: str) -> bool:
    """Check if user is an admin or owner"""
    return user_role in [Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN]


def is_owner(user_role: str) -> bool:
    """Check if user is an owner"""
    return user_role == Role.OWNER


def can_view_full_data(user_role: str, user_permissions: List[str]) -> bool:
    """
    Check if user can view unmasked/full lead data.
    
    Args:
        user_role: User's role
        user_permissions: User's custom permissions
        
    Returns:
        True if user can see full data, False if data should be masked
    """
    return has_permission(user_role, user_permissions, Permission.VIEW_FULL_LEADS)
