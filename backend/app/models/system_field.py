from datetime import datetime
from typing import Optional, Literal, List
from beanie import Document
from pydantic import BaseModel, Field

class AliasEntry(BaseModel):
    alias_raw: str
    alias_normalized: str
    scope: Literal["global", "vendor", "source"] = "source"
    confidence: Literal["manual", "suggested", "magic"] = "suggested"
    owner_id: Optional[str] = None
    vendor_id: Optional[str] = None
    source_id: Optional[str] = None

class SystemField(Document):
    tenant_id: str
    owner_id: str = Field(..., description="ID of the user who owns this field")
    field_key: str = Field(..., description="Unique key for the system field, e.g., 'monthly_income'")
    label: str = Field(..., description="Human readable label, e.g., 'Monthly Income'")
    data_type: Literal["string", "number", "boolean", "date", "object", "array"] = "string"
    category: Optional[str] = None
    description: Optional[str] = None
    is_required: bool = False
    aliases: List[AliasEntry] = Field(default_factory=list, description="Global list of aliases for this field")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "system_fields"
        indexes = [
            "tenant_id",
            "owner_id",
            "field_key",
            "aliases.alias_normalized",
            "aliases.owner_id",
        ]
