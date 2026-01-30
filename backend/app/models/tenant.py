from typing import Optional, List
from datetime import datetime
from beanie import Document, Indexed
from pydantic import Field, EmailStr

class Tenant(Document):
    name: Indexed(str, unique=True)
    slug: Indexed(str, unique=True)
    owner_id: str  # User ID of the tenant owner
    status: str = "active"  # active, suspended, disabled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "tenants"
