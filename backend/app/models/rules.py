from pydantic import BaseModel
from typing import Optional, List, Union, Literal

class RuleCondition(BaseModel):
    field: str
    op: Literal["eq", "neq", "gt", "lt", "gte", "lte", "in", "nin", "contains", "regex"]
    value: Union[str, int, float, bool, List[str], List[int]]

class RuleGroup(BaseModel):
    logic: Literal["and", "or"]
    conditions: List[Union[RuleCondition, 'RuleGroup']]

class SourceRules(BaseModel):
    filtering: Optional[RuleGroup] = None
