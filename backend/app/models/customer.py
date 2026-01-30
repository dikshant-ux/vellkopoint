from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from beanie import Document, Link
from pydantic import BaseModel, Field, validator
import uuid
from app.models.campaign import Campaign
from app.models.destination import Destination


class Customer(Document):
    tenant_id: str
    owner_id: str
    name: str
    status: Literal["enabled", "disabled"] = "enabled"
    readable_id: Optional[str] = None
    destinations: List[str] = []
    campaigns: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @validator("destinations", "campaigns", pre=True, each_item=True)
    def coerce_to_string_id(cls, v):
        if v is None:
            return v
        # Handle Link objects
        if hasattr(v, 'ref') and v.ref.id:
            return str(v.ref.id)
        # Handle DBRef as dict or object
        if isinstance(v, dict) and '$id' in v:
            val = v['$id']
            if isinstance(val, dict) and '$oid' in val:
                return str(val['$oid'])
            return str(val)
        # Handle pymongo DBRef or raw ObjectId
        if hasattr(v, 'id'):
            return str(v.id)
        return str(v)
    
    class Settings:
        name = "customers"
        indexes = [
            "tenant_id",
            "owner_id",
            "readable_id",
            "status",
            "created_at"
        ]
