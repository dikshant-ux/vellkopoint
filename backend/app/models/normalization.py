from pydantic import BaseModel
from typing import Optional, List

class NormalizationRule(BaseModel):
    field: str
    operation: str # e.g., "lowercase", "uppercase", "trim", "phone_format", "date_format"
    params: Optional[dict] = {}

class SourceNormalization(BaseModel):
    rules: List[NormalizationRule] = []
