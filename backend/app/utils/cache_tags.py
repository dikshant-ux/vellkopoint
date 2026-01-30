# Cache Tags for Grouped Invalidation
# Use these constants to tag cache entries for bulk invalidation

# Entity-based tags
TAG_VENDORS = "vendors"
TAG_SOURCES = "sources"
TAG_CUSTOMERS = "customers"
TAG_CAMPAIGNS = "campaigns"
TAG_DESTINATIONS = "destinations"
TAG_SYSTEM_FIELDS = "system_fields"
TAG_UNKNOWN_FIELDS = "unknown_fields"
TAG_LEADS = "leads"
TAG_USERS = "users"

# Operation-based tags
TAG_STATS = "stats"
TAG_LIST = "list"
TAG_DETAIL = "detail"

# Composite tags (combine entity + operation)
def vendor_stats_tag() -> str:
    return f"{TAG_VENDORS}:{TAG_STATS}"

def vendor_list_tag() -> str:
    return f"{TAG_VENDORS}:{TAG_LIST}"

def source_stats_tag() -> str:
    return f"{TAG_SOURCES}:{TAG_STATS}"

def customer_stats_tag() -> str:
    return f"{TAG_CUSTOMERS}:{TAG_STATS}"

def system_fields_list_tag() -> str:
    return f"{TAG_SYSTEM_FIELDS}:{TAG_LIST}"

# Tag helpers
def get_entity_tags(entity_type: str, entity_id: str = None) -> list[str]:
    """Get all tags for an entity"""
    tags = [entity_type]
    if entity_id:
        tags.append(f"{entity_type}:{entity_id}")
    return tags

def get_user_tags(user_id: str) -> list[str]:
    """Get all tags for a user's cached data"""
    return [f"user:{user_id}"]
