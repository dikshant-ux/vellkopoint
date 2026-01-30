from pydantic import BaseModel
from typing import Optional, Dict

class MappingRule(BaseModel):
    source_field: str
    target_field: Optional[str] = None
    default_value: Optional[str] = None
    is_required: bool = False
    regex_validation: Optional[str] = None
    is_static: bool = False  # True = static custom field with hardcoded value

class SourceMapping(BaseModel):
    rules: list[MappingRule] = []
