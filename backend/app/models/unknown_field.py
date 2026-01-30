from datetime import datetime
from typing import Optional, Any, Literal
from beanie import Document
from pydantic import Field

class UnknownField(Document):
    tenant_id: str
    owner_id: str
    source_id: str = Field(..., description="ID of the source where this field was found")
    field_name: str = Field(..., description="The key/name of the unknown field")
    sample_value: Optional[str] = Field(None, description="A sample value caught during ingestion")
    detected_count: int = Field(default=1, description="Number of times this field has been seen")
    status: Literal["unmapped", "mapped", "ignored"] = "unmapped"
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "unknown_fields"
        indexes = [
            "tenant_id",
            "owner_id",
            "source_id",
            "field_name", 
            "status",
            "last_seen"
        ]
