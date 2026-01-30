from fastapi import Request, HTTPException
from app.core.redis_manager import get_cache_redis
from app.core.config import settings
import time
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Redis-based rate limiter"""
    
    @staticmethod
    async def check_rate_limit(
        identifier: str,
        max_requests: int,
        window_seconds: int,
        redis_key_prefix: str = "rate_limit"
    ) -> tuple[bool, dict]:
        """
        Check if request is within rate limit
        
        Args:
            identifier: Unique identifier (user_id, IP, etc.)
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            redis_key_prefix: Prefix for Redis keys
            
        Returns:
            (is_allowed, info_dict)
        """
        if not settings.RATE_LIMIT_ENABLED:
            return True, {"remaining": max_requests, "reset": 0}
        
        redis = await get_cache_redis()
        key = f"{redis_key_prefix}:{identifier}"
        
        try:
            # Get current count
            current = await redis.get(key)
            
            if current is None:
                # First request in window
                await redis.setex(key, window_seconds, 1)
                return True, {
                    "remaining": max_requests - 1,
                    "reset": int(time.time()) + window_seconds,
                    "limit": max_requests
                }
            
            current_count = int(current)
            
            if current_count >= max_requests:
                # Rate limit exceeded
                ttl = await redis.ttl(key)
                return False, {
                    "remaining": 0,
                    "reset": int(time.time()) + ttl,
                    "limit": max_requests,
                    "retry_after": ttl
                }
            
            # Increment counter
            await redis.incr(key)
            ttl = await redis.ttl(key)
            
            return True, {
                "remaining": max_requests - current_count - 1,
                "reset": int(time.time()) + ttl,
                "limit": max_requests
            }
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Fail open - allow request if Redis is down
            return True, {"remaining": max_requests, "reset": 0}

async def rate_limit_dependency(request: Request):
    """
    FastAPI dependency for rate limiting
    Use with: dependencies=[Depends(rate_limit_dependency)]
    """
    # Get identifier (prefer user ID, fallback to IP)
    identifier = None
    
    # Try to get user from request state (set by auth middleware)
    if hasattr(request.state, "user") and request.state.user:
        identifier = f"user:{request.state.user.id}"
    else:
        # Fallback to IP address
        client_ip = request.client.host if request.client else "unknown"
        identifier = f"ip:{client_ip}"
    
    # Check rate limit (60 requests per minute)
    is_allowed, info = await RateLimiter.check_rate_limit(
        identifier=identifier,
        max_requests=settings.RATE_LIMIT_PER_MINUTE,
        window_seconds=60
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "retry_after": info.get("retry_after", 60),
                "limit": info.get("limit"),
                "reset": info.get("reset")
            }
        )
    
    # Add rate limit headers to response (will be set by middleware)
    request.state.rate_limit_info = info

async def rate_limit_strict(request: Request):
    """
    Stricter rate limit for expensive operations
    Use with: dependencies=[Depends(rate_limit_strict)]
    """
    identifier = None
    
    if hasattr(request.state, "user") and request.state.user:
        identifier = f"user:{request.state.user.id}"
    else:
        client_ip = request.client.host if request.client else "unknown"
        identifier = f"ip:{client_ip}"
    
    # Stricter limit: 10 requests per minute
    is_allowed, info = await RateLimiter.check_rate_limit(
        identifier=identifier,
        max_requests=10,
        window_seconds=60,
        redis_key_prefix="rate_limit_strict"
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded for this endpoint",
                "retry_after": info.get("retry_after", 60),
                "limit": info.get("limit"),
                "reset": info.get("reset")
            }
        )
    
    request.state.rate_limit_info = info
