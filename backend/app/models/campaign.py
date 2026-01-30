from typing import List, Optional, Literal
from datetime import datetime
from beanie import Document
from pydantic import BaseModel, Field
import uuid
from app.models.rules import SourceRules
from app.models.mapping import SourceMapping

class CampaignConfig(BaseModel):
    priority: int = 0
    weight: int = 100
    status: Literal["enabled", "disabled"] = "enabled"
    
    # Daily Capping
    monday_cap: Optional[int] = None
    tuesday_cap: Optional[int] = None
    wednesday_cap: Optional[int] = None
    thursday_cap: Optional[int] = None
    friday_cap: Optional[int] = None
    saturday_cap: Optional[int] = None
    sunday_cap: Optional[int] = None
    
    # Scheduling
    all_day: bool = True
    start_time: Optional[str] = "00:00"  # HH:MM
    end_time: Optional[str] = "23:59"    # HH:MM
    
    # Global Limits
    campaign_max: Optional[int] = None
    hourly_cap: Optional[int] = None
    
    # Additional Controls
    allow_duplicates: str = "always" # always, never, etc.
    send_failed_to: Optional[str] = None # ID of another campaign

class Campaign(Document):
    tenant_id: str
    owner_id: str
    readable_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    
    # Destination Linking
    destination_id: str
    
    # Source Filtering (Lead origin restriction)
    # Empty list means all sources are allowed
    source_ids: List[str] = []
    
    # Routing logic
    config: CampaignConfig = CampaignConfig()
    
    # Filtering & Mapping
    rules: SourceRules = SourceRules()
    mapping: SourceMapping = SourceMapping()
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "campaigns"
        indexes = [
            "tenant_id",
            "owner_id",
            "destination_id",
            "created_at"
        ]
