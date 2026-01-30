from typing import List, Optional, Literal
from datetime import datetime
from beanie import Document, Link
from pydantic import BaseModel, Field
import uuid
from app.models.mapping import SourceMapping
from app.models.normalization import SourceNormalization
from app.models.rules import SourceRules
from pydantic import model_validator



class SourceConfig(BaseModel):
    rate_limit: int = 100 # requests per minute
    status: Literal["enabled", "disabled"] = "enabled"

    # Duplicate Checking
    dupe_check: bool = False
    dupe_check_days: int = 0  # 0 = never, >0 = days timeframe
    dupe_fields: List[str] = [] # List of fields to check (OR logic by default)

    # Dynamic and Extended Config
    rate: Optional[float] = None
    dynamic_dupe_check: bool = False
    exclude_from_global_dupe_checks: bool = False
    append_dupes: bool = False
    use_as_suppression_list: bool = False
    send_filtered_leads_to: Optional[str] = None
    dupe_check_timeframe: str = "disabled" # Literal["disabled", "24h", "7d", "30d"]
    dupe_field_1: Optional[str] = None
    dupe_field_2: Optional[str] = None
    dupe_field_operator: str = "or" # Literal["or", "and"]

    @model_validator(mode='before')
    @classmethod
    def upgrade_legacy_fields(cls, data):
        if isinstance(data, dict):
            # Map legacy 'active' status to 'enabled'
            if data.get('status') == 'active':
                data['status'] = 'enabled'
            
            # Handle legacy 'enabled' boolean if present
            # If enabled was explicitly False, respect it.
            if 'enabled' in data:
                if data['enabled'] is False:
                    data['status'] = 'disabled'
                # If enabled is True, status takes precedence (which we just mapped)
                # Remove the legacy field so strict validation doesn't fail
                data.pop('enabled')
        return data


class SourceValidationConfig(BaseModel):
    validation_type: Optional[str] = None
    validation_url: Optional[str] = None
    validation_field: Optional[str] = None
    validation_api_key: Optional[str] = None
    
import string
import random

def generate_readable_id(prefix: str, length: int = 6) -> str:
    """Generates a random ID like VND-1A2B3C"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choice(chars) for _ in range(length))
    return f"{prefix}-{suffix}"

class Source(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    readable_id: Optional[str] = None
    name: str
    type: str = "api" # api, webhook, file
    api_key: str = Field(default_factory=lambda: str(uuid.uuid4().hex))
    config: SourceConfig = SourceConfig()
    validation: SourceValidationConfig = SourceValidationConfig()
    mapping: SourceMapping = SourceMapping()
    normalization: SourceNormalization = SourceNormalization()
    rules: SourceRules = SourceRules()
    created_at: datetime = Field(default_factory=datetime.now)

class Vendor(Document):
    tenant_id: str
    owner_id: str
    name: str
    readable_id: Optional[str] = None
    status: Literal["enabled", "disabled"] = "enabled"

    @model_validator(mode='before')
    @classmethod
    def upgrade_legacy_status(cls, data):
        if isinstance(data, dict):
            if data.get('status') == 'active':
                data['status'] = 'enabled'
        return data

    sources: List[Source] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "vendors"
        indexes = [
            "tenant_id",
            "owner_id",
            "readable_id",
            "status",
            "created_at"
        ]
