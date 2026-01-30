from typing import Dict, Any, Optional, List, Literal
from datetime import datetime
from beanie import Document
from pydantic import Field, BaseModel

class RoutingResult(BaseModel):
    customer_id: str
    customer_name: Optional[str] = None
    campaign_id: str
    campaign_name: Optional[str] = None
    destination_id: Optional[str] = None
    destination_name: Optional[str] = None
    status: str  # delivered, failed, skipped
    delivered_at: datetime = Field(default_factory=datetime.utcnow)
    error_message: Optional[str] = None

class Lead(Document):
    tenant_id: str
    owner_id: str
    vendor_id: str
    source_id: str
    lead_id: Optional[str] = None
    external_id: Optional[str] = None
    data: Dict[str, Any]
    original_payload: Dict[str, Any]
    status: Literal["new", "processed", "exported", "rejected"] = "new"
    rejection_reason: Optional[str] = None
    routing_results: List[RoutingResult] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None

    class Settings:
        name = "leads"
        indexes = [
            "tenant_id",
            "owner_id",
            "vendor_id",
            "source_id",
            "status",
            "created_at",
            "lead_id",
            "external_id",
            "external_id",
            [("owner_id", 1), ("created_at", -1)],
            [("$**", "text")]
        ]
        language_override = "none" # Disable language override to prevent errors with 'language' field in data
