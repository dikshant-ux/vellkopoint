from datetime import timedelta, datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, status, Response, Request, BackgroundTasks, Form
from fastapi.security import OAuth2PasswordRequestForm
from app.core import security
from app.core.config import settings
from app.models.user import User, RefreshToken
from app.services import email_service
from app.api import deps
from app.utils.cache import cache, invalidate_cache
from pydantic import BaseModel, EmailStr, Field
import pyotp
import qrcode
import io
import base64
import re
import secrets
from app.models.tenant import Tenant
from app.core.roles import Role

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    confirm_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    full_name: str
    is_verified: bool
    role: str
    role_id: Optional[str] = None
    permissions: List[str] = []

class VerifyEmail(BaseModel):
    token: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class TwoFactorSetup(BaseModel):
    secret: str
    qr_code: str

class TwoFactorEnable(BaseModel):
    token: str
    secret: str

class TwoFactorDisable(BaseModel):
    password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


@router.post("/signup", response_model=Any)
async def signup(user_in: UserCreate, background_tasks: BackgroundTasks):
    if user_in.password != user_in.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match",
        )
    
    user = await User.find_one(User.email == user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    
    # Create a new Tenant for this user
    tenant_name = f"{user_in.full_name}'s Workspace"
    
    # Check if tenant with this name already exists
    existing_tenant = await Tenant.find_one(Tenant.name == tenant_name)
    if existing_tenant:
        tenant_name = f"{tenant_name} {secrets.token_hex(2)}"
    # Simple slug generation
    slug_base = re.sub(r'[^a-z0-9]', '', tenant_name.lower())
    slug = f"{slug_base}-{secrets.token_hex(4)}"
    
    # Create tenant with temporary owner_id
    tenant = Tenant(
        name=tenant_name,
        slug=slug,
        owner_id="pending",
        status="active"
    )
    await tenant.create()
    
    # Create verification token
    verification_token = security.create_verification_token()
    
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        verification_token=verification_token,
        verification_token_expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        is_verified=False, # Enforce verification flow
        tenant_id=str(tenant.id),
        role=Role.OWNER # User is the owner of their new tenant
    )
    await user.insert()
    
    # Update tenant with actual owner_id
    tenant.owner_id = str(user.id)
    await tenant.save()
    
    # Send verification email in background
    background_tasks.add_task(email_service.send_verification_email, user.email, verification_token)
    
    return {"message": "User created successfully. Please check your email to verify your account."}


@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = False,
    otp: str = Form(None)
):
    user = await User.find_one(User.email == form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    
    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    # 2FA Verification
    if user.is_two_factor_enabled:
        if not otp:
            raise HTTPException(
                status_code=403,
                detail="2FA_REQUIRED",
            )
        
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(otp):
             raise HTTPException(
                status_code=401,
                detail="Invalid 2FA code",
            )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="EMAIL_NOT_VERIFIED"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Determine refresh token expiry based on remember_me
    refresh_token_days = settings.REFRESH_TOKEN_EXPIRE_DAYS_REMEMBER_ME if remember_me else settings.REFRESH_TOKEN_EXPIRE_DAYS
    refresh_token_expires = timedelta(days=refresh_token_days)

    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    refresh_token = security.create_refresh_token(
        user.id, expires_delta=refresh_token_expires
    )
    
    # Store refresh token hash in DB
    refresh_token_hash = security.get_password_hash(refresh_token)
    expires_at = datetime.now(timezone.utc) + refresh_token_expires
    
    user.refresh_tokens.append(RefreshToken(token_hash=refresh_token_hash, expires_at=expires_at))
    await user.save()

    # Set HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=int(refresh_token_expires.total_seconds())
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "full_name": user.full_name or "",
        "is_verified": user.is_verified,
        "role": user.role,
        "role_id": user.role_id,
        "permissions": await _get_merged_permissions(user)
    }

async def _get_merged_permissions(user: User) -> List[str]:
    from app.core.roles import get_role_permissions
    from app.models.role import Role as RoleDocument
    
    all_perms = set(get_role_permissions(user.role))
    if user.role_id:
        role_doc = await RoleDocument.get(user.role_id)
        if role_doc:
            all_perms.update(role_doc.permissions)
    return list(all_perms)


@router.post("/refresh", response_model=Token)
async def refresh_token(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        payload = security.jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload["type"] != "refresh":
            response.delete_cookie("refresh_token", httponly=True, samesite="lax")
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload["sub"]
        user = await User.get(user_id)
        if not user:
             response.delete_cookie("refresh_token", httponly=True, samesite="lax")
             raise HTTPException(status_code=401, detail="User not found")

        # Validate token against DB hashes
        valid_token_found = False
        remaining_tokens = []
        now = datetime.now(timezone.utc)

        for rt in user.refresh_tokens:
            expires_at = rt.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if expires_at > now:
                if security.verify_password(refresh_token, rt.token_hash):
                    valid_token_found = True
                    # Don't keep the used token (rotation)
                else:
                    remaining_tokens.append(rt)
        
        if not valid_token_found:
             # Potential token reuse attack - invalidate all!
             user.refresh_tokens = []
             await user.save()
             response.delete_cookie("refresh_token", httponly=True, samesite="lax")
             raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Create new tokens (Rotation)
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS) # Default to 1 day on refresh usually, or keep original duration? Let's use standard.

        new_access_token = security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
        new_refresh_token = security.create_refresh_token(
            user.id, expires_delta=refresh_token_expires
        )
        
        new_rt_hash = security.get_password_hash(new_refresh_token)
        expires_at = datetime.now(timezone.utc) + refresh_token_expires
        
        remaining_tokens.append(RefreshToken(token_hash=new_rt_hash, expires_at=expires_at))
        user.refresh_tokens = remaining_tokens
        await user.save()

        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=settings.ENVIRONMENT == "production",
            samesite="lax",
            max_age=int(refresh_token_expires.total_seconds())
        )

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
             "user_id": str(user.id),
            "full_name": user.full_name or "",
            "is_verified": user.is_verified,
            "role": user.role,
            "role_id": user.role_id,
            "permissions": await _get_merged_permissions(user)
        }

    except Exception as e:
         print(f"Refresh error: {e}")
         response.delete_cookie("refresh_token", httponly=True, samesite="lax")
         raise HTTPException(status_code=401, detail="Could not refresh token")


@router.post("/clear-session")
async def clear_session(response: Response):
    response.delete_cookie("refresh_token", httponly=True, samesite="lax")
    await invalidate_cache(f"fastapi-cache:*:/api/v1/auth/me")
    return {"message": "Session cleared"}

@router.post("/logout")
async def logout(response: Response, current_user: User = Depends(deps.get_current_user)):
    # Invalidate all refresh tokens for security on explicit logout
    # Or just remove the cookie? Let's clear the DB for this user's sessions to be safe or just the one matching?
    # For simplicitly and security, let's clear all for now, or we would need to pass the refresh token to identify which one to remove.
    # Since HTTPOnly cookie isn't easily accessible to JS, standard practice is often just clearing cookie.
    # But we want to invalidate. We can just clear all for this user.
    current_user.refresh_tokens = []
    await current_user.save()
    
    response.delete_cookie("refresh_token", httponly=True, samesite="lax")
    await invalidate_cache(f"fastapi-cache:{current_user.id}:/api/v1/auth/me")
    return {"message": "Logged out successfully"}


@router.post("/verify-email")
async def verify_email_endpoint(data: VerifyEmail):
    user = await User.find_one(User.verification_token == data.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    if user.verification_token_expires_at:
        # Ensure db datetime is timezone aware (assume UTC)
        expires_at = user.verification_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification token expired")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    await user.save()
    
    return {"message": "Email verified successfully"}
    
@router.post("/resend-verification")
async def resend_verification(data: ForgotPassword, background_tasks: BackgroundTasks):
    user = await User.find_one(User.email == data.email)
    if not user:
        # Silently fail for security or return error? User knows their email.
        raise HTTPException(status_code=404, detail="Account not found")
    
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account is already verified")
        
    # Create new verification token
    verification_token = security.create_verification_token()
    user.verification_token = verification_token
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    await user.save()
    
    # Send verification email in background
    background_tasks.add_task(email_service.send_verification_email, user.email, verification_token)
    
    return {"message": "Verification email resent. Please check your inbox."}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = await User.find_one(User.email == data.email)
    if not user:
        # Don't reveal user existence
        return {"message": "If an account exists with this email, a reset link will be sent."}
    
    reset_token = security.create_verification_token()
    user.reset_password_token = reset_token
    user.reset_password_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await user.save()
    
    await email_service.send_reset_password_email(user.email, reset_token)
    return {"message": "If an account exists with this email, a reset link will be sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPassword):
    user = await User.find_one(User.reset_password_token == data.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if user.reset_password_token_expires_at and user.reset_password_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
        
    user.hashed_password = security.get_password_hash(data.new_password)
    user.reset_password_token = None
    user.reset_password_token_expires_at = None
    # Invalidate all existing sessions
    user.refresh_tokens = []
    await user.save()
    await invalidate_cache(f"fastapi-cache:{user.id}:/api/v1/auth/me")
    
    return {"message": "Password reset successfully"}

@router.post("/2fa/setup", response_model=TwoFactorSetup)
async def setup_two_factor(current_user: User = Depends(deps.get_current_user)):
    secret = pyotp.random_base32()
    
    # Generate QR Code
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name=settings.PROJECT_NAME)
    
    img = qrcode.make(uri)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{img_str}"
    }

@router.post("/2fa/enable")
async def enable_two_factor(
    data: TwoFactorEnable,
    current_user: User = Depends(deps.get_current_user)
):
    totp = pyotp.TOTP(data.secret)
    if not totp.verify(data.token):
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    current_user.two_factor_secret = data.secret
    current_user.is_two_factor_enabled = True
    await current_user.save()
    
    return {"message": "Two-factor authentication enabled successfully"}

@router.post("/2fa/disable")
async def disable_two_factor(
    data: TwoFactorDisable,
    current_user: User = Depends(deps.get_current_user)
):
    if not security.verify_password(data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=403,
            detail="Incorrect password"
        )

    current_user.is_two_factor_enabled = False
    current_user.two_factor_secret = None
    await current_user.save()
    
    return {"message": "Two-factor authentication disabled successfully"}

@router.put("/password")
async def change_password(
    data: ChangePassword,
    current_user: User = Depends(deps.get_current_user)
):
    if not security.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    current_user.hashed_password = security.get_password_hash(data.new_password)
    # Optional: Invalidate sessions for security
    current_user.refresh_tokens = [] 
    await current_user.save()
    await invalidate_cache(f"fastapi-cache:{current_user.id}:/api/v1/auth/me")
    
    return {"message": "Password updated successfully"}

@router.get("/me", response_model=Any)

async def read_users_me(
    request: Request,
    current_user: User = Depends(deps.get_current_user)
):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
        "is_two_factor_enabled": current_user.is_two_factor_enabled,
        "role": current_user.role,
        "role_id": current_user.role_id,
        "permissions": current_user.permissions
    }
