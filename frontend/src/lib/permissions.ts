export const Permission = {
    // Lead Management
    VIEW_LEADS: "view_leads",
    VIEW_FULL_LEADS: "view_full_leads",  // See unmasked sensitive data
    EXPORT_LEADS: "export_leads",
    DELETE_LEADS: "delete_leads",

    // Destination Management
    VIEW_DESTINATIONS: "view_destinations",
    APPROVE_DESTINATIONS: "approve_destinations",
    CREATE_DESTINATIONS: "create_destinations",
    EDIT_DESTINATIONS: "edit_destinations",
    DELETE_DESTINATIONS: "delete_destinations",

    // User Management
    VIEW_USERS: "view_users",
    MANAGE_USERS: "manage_users",
    INVITE_USERS: "invite_users",
    DELETE_USERS: "delete_users",

    // System Fields
    VIEW_SYSTEM_FIELDS: "view_system_fields",
    CREATE_SYSTEM_FIELDS: "create_system_fields",
    EDIT_SYSTEM_FIELDS: "edit_system_fields",
    DELETE_SYSTEM_FIELDS: "delete_system_fields",

    // Analytics
    VIEW_ANALYTICS: "view_analytics",
    EXPORT_REPORTS: "export_reports",

    // Vendor Management
    VIEW_VENDORS: "view_vendors",
    CREATE_VENDORS: "create_vendors",
    EDIT_VENDORS: "edit_vendors",
    DELETE_VENDORS: "delete_vendors",

    // Source Management
    VIEW_SOURCES: "view_sources",
    CREATE_SOURCES: "create_sources",
    EDIT_SOURCES: "edit_sources",
    DELETE_SOURCES: "delete_sources",

    // Customer Management
    VIEW_CUSTOMERS: "view_customers",
    CREATE_CUSTOMERS: "create_customers",
    EDIT_CUSTOMERS: "edit_customers",
    DELETE_CUSTOMERS: "delete_customers",

    // Campaign Management
    VIEW_CAMPAIGNS: "view_campaigns",
    CREATE_CAMPAIGNS: "create_campaigns",
    EDIT_CAMPAIGNS: "edit_campaigns",
    DELETE_CAMPAIGNS: "delete_campaigns",

    // Roles Management
    VIEW_ROLES: "roles:read",
    CREATE_ROLES: "roles:write",
    DELETE_ROLES: "roles:delete",

    // Settings
    MANAGE_SETTINGS: "manage_settings",

} as const;

export const PERMISSION_LABELS: Record<string, { label: string, description: string }> = {
    [Permission.VIEW_FULL_LEADS]: {
        label: "View Unmasked Leads",
        description: "Access to PII like email and phone numbers without masking."
    },
    [Permission.EXPORT_LEADS]: {
        label: "Export Leads",
        description: "Permission to download lead data as CSV/JSON."
    },
    [Permission.APPROVE_DESTINATIONS]: {
        label: "Approve Destinations",
        description: "Can approve or reject pending destination endpoints."
    },
    [Permission.MANAGE_USERS]: {
        label: "Manage Users",
        description: "Can update roles and deactivate other users."
    },
    [Permission.INVITE_USERS]: {
        label: "Invite Users",
        description: "Can send email invitations to new members."
    },
    [Permission.EXPORT_REPORTS]: {
        label: "Export Reports",
        description: "Can download analytics reports and performance data."
    },
    [Permission.VIEW_ROLES]: {
        label: "View Roles",
        description: "Can view available roles and their permissions."
    },
    [Permission.CREATE_ROLES]: {
        label: "Manage Roles",
        description: "Can create and update roles."
    },
    [Permission.DELETE_ROLES]: {
        label: "Delete Roles",
        description: "Can delete custom roles."
    },
    [Permission.MANAGE_SETTINGS]: {
        label: "Manage Settings",
        description: "Access to general system settings."
    }
};

export const ALL_FRONTEND_PERMISSIONS = Object.values(Permission);
