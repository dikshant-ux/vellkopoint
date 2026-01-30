"""
Permission constants for RBAC system.
Each permission represents a specific action that can be performed in the system.
"""

class Permission:
    """Permission constants for role-based access control"""
    
    # Vendor Management
    VIEW_VENDORS = "view_vendors"
    CREATE_VENDORS = "create_vendors"
    EDIT_VENDORS = "edit_vendors"
    DELETE_VENDORS = "delete_vendors"
    
    # Source Management
    VIEW_SOURCES = "view_sources"
    CREATE_SOURCES = "create_sources"
    EDIT_SOURCES = "edit_sources"
    DELETE_SOURCES = "delete_sources"
    
    # Lead Management
    VIEW_LEADS = "view_leads"
    VIEW_FULL_LEADS = "view_full_leads"  # See unmasked sensitive data
    EXPORT_LEADS = "export_leads"
    DELETE_LEADS = "delete_leads"
    
    # Customer Management
    VIEW_CUSTOMERS = "view_customers"
    CREATE_CUSTOMERS = "create_customers"
    EDIT_CUSTOMERS = "edit_customers"
    DELETE_CUSTOMERS = "delete_customers"
    
    # Destination Management
    VIEW_DESTINATIONS = "view_destinations"
    CREATE_DESTINATIONS = "create_destinations"
    EDIT_DESTINATIONS = "edit_destinations"
    DELETE_DESTINATIONS = "delete_destinations"
    APPROVE_DESTINATIONS = "approve_destinations"  # Admin only
    
    # Campaign Management
    VIEW_CAMPAIGNS = "view_campaigns"
    CREATE_CAMPAIGNS = "create_campaigns"
    EDIT_CAMPAIGNS = "edit_campaigns"
    DELETE_CAMPAIGNS = "delete_campaigns"
    
    # System Fields
    VIEW_SYSTEM_FIELDS = "view_system_fields"
    CREATE_SYSTEM_FIELDS = "create_system_fields"
    EDIT_SYSTEM_FIELDS = "edit_system_fields"
    DELETE_SYSTEM_FIELDS = "delete_system_fields"
    
    # User Management
    VIEW_USERS = "view_users"
    INVITE_USERS = "invite_users"
    MANAGE_USERS = "manage_users"  # Edit roles, deactivate
    DELETE_USERS = "delete_users"
    
    # Analytics & Reports
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_REPORTS = "export_reports"
    
    # System Settings
    MANAGE_SETTINGS = "manage_settings"
    
    # Roles Management
    VIEW_ROLES = "roles:read"
    CREATE_ROLES = "roles:write"
    EDIT_ROLES = "roles:write"
    DELETE_ROLES = "roles:delete"


# List of all permissions for easy iteration
ALL_PERMISSIONS = [
    # Vendors
    Permission.VIEW_VENDORS,
    Permission.CREATE_VENDORS,
    Permission.EDIT_VENDORS,
    Permission.DELETE_VENDORS,
    
    # Sources
    Permission.VIEW_SOURCES,
    Permission.CREATE_SOURCES,
    Permission.EDIT_SOURCES,
    Permission.DELETE_SOURCES,
    
    # Leads
    Permission.VIEW_LEADS,
    Permission.VIEW_FULL_LEADS,
    Permission.EXPORT_LEADS,
    Permission.DELETE_LEADS,
    
    # Customers
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.EDIT_CUSTOMERS,
    Permission.DELETE_CUSTOMERS,
    
    # Destinations
    Permission.VIEW_DESTINATIONS,
    Permission.CREATE_DESTINATIONS,
    Permission.EDIT_DESTINATIONS,
    Permission.DELETE_DESTINATIONS,
    Permission.APPROVE_DESTINATIONS,
    
    # Campaigns
    Permission.VIEW_CAMPAIGNS,
    Permission.CREATE_CAMPAIGNS,
    Permission.EDIT_CAMPAIGNS,
    Permission.DELETE_CAMPAIGNS,
    
    # System Fields
    Permission.VIEW_SYSTEM_FIELDS,
    Permission.CREATE_SYSTEM_FIELDS,
    Permission.EDIT_SYSTEM_FIELDS,
    Permission.DELETE_SYSTEM_FIELDS,
    
    # Users
    Permission.VIEW_USERS,
    Permission.INVITE_USERS,
    Permission.MANAGE_USERS,
    Permission.DELETE_USERS,
    
    # Analytics
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_REPORTS,
    
    # Settings
    Permission.MANAGE_SETTINGS,
    
    # Roles
    Permission.VIEW_ROLES,
    Permission.CREATE_ROLES,
    # Permission.EDIT_ROLES, # Duplicate of CREATE_ROLES
    Permission.DELETE_ROLES,
]
