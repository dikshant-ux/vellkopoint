from datetime import datetime
from beanie import Document
from pydantic import Field

class AnalyticsEvent(Document):
    owner_id: str
    event_type: str # ingest, delivery_success, delivery_failed, rejection
    source_id: str
    vendor_id: str | None = None
    customer_id: str | None = None
    campaign_id: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    meta: dict = {}
    
    class Settings:
        name = "analytics_events"
        indexes = [
            "owner_id",
            "event_type",
            "source_id",
            "vendor_id",
            "customer_id",
            "campaign_id",
            "timestamp",
            [("owner_id", 1), ("timestamp", -1)]
        ]
