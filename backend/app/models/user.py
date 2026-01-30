from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, EmailStr
from beanie import Document, Indexed

class RefreshToken(BaseModel):
    token_hash: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

class User(Document):
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    is_verified: bool = False
    verification_token: Optional[str] = None
    verification_token_expires_at: Optional[datetime] = None
    reset_password_token: Optional[str] = None
    reset_password_token_expires_at: Optional[datetime] = None
    is_two_factor_enabled: bool = False
    two_factor_secret: Optional[str] = None
    refresh_tokens: List[RefreshToken] = []
    
    # RBAC & Multi-tenancy Fields
    tenant_id: Optional[str] = None  # Reference to Tenant ID
    role: str = "user"  # super_admin, admin, user, or custom role name
    role_id: Optional[str] = None  # Reference to custom Role ID
    permissions: List[str] = [] # Transient field (dynamically merged from roles)
    invited_by: Optional[str] = None  # User ID of admin who invited
    invitation_token: Optional[str] = None  # For email invitation
    invitation_expires: Optional[datetime] = None  # Token expiry (24 hours)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
