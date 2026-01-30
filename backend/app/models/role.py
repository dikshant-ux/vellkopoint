from typing import List, Optional
from datetime import datetime
from pydantic import Field
from beanie import Document, Indexed

class Role(Document):
    name: Indexed(str)
    description: Optional[str] = ""
    permissions: List[str] = []  # List of strings like "leads:read", "users:write"
    tenant_id: Indexed(str)
    is_system: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "roles"
        indexes = [
            [("name", 1), ("tenant_id", 1)]
        ]
