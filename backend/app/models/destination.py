from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from beanie import Document
from pydantic import BaseModel, Field
import uuid

class DestinationConfig(BaseModel):
    url: str
    method: str = "POST"
    headers: Dict[str, str] = {}
    auth_type: str = "none" # basic, bearer, custom
    auth_credentials: Dict[str, str] = {}
    timeout: int = 5 # seconds
    api_key: Optional[str] = None
    
class Destination(Document):
    tenant_id: str
    owner_id: str
    name: str
    type: str = "api" # api, webhook
    config: DestinationConfig
    enabled: bool = True
    
    # Approval Workflow Fields
    approval_status: str = "pending"  # pending, approved, rejected
    requested_by: Optional[str] = None  # User ID who created the destination
    approved_by: Optional[str] = None  # Admin ID who approved/rejected
    approval_date: Optional[datetime] = None  # When it was approved/rejected
    rejection_reason: Optional[str] = None  # Reason for rejection

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "destinations"
        indexes = [
            "tenant_id",
            "owner_id",
            "approval_status",
            "created_at"
        ]
