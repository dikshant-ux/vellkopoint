import json
import functools
import hashlib
from typing import Any, Callable, Optional
from fastapi import Request, Response
from app.core.redis_manager import get_cache_redis
from app.core.config import settings
import logging
import time

logger = logging.getLogger(__name__)

# Cache version for schema changes
CACHE_VERSION = "v1"

class CacheMetrics:
    """Track cache performance metrics"""
    hits: int = 0
    misses: int = 0
    errors: int = 0
    
    @classmethod
    def record_hit(cls):
        cls.hits += 1
        
    @classmethod
    def record_miss(cls):
        cls.misses += 1
        
    @classmethod
    def record_error(cls):
        cls.errors += 1
    
    @classmethod
    def get_stats(cls) -> dict:
        total = cls.hits + cls.misses
        hit_rate = (cls.hits / total * 100) if total > 0 else 0
        return {
            "hits": cls.hits,
            "misses": cls.misses,
            "errors": cls.errors,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total
        }
    
    @classmethod
    def reset(cls):
        cls.hits = 0
        cls.misses = 0
        cls.errors = 0

def cache(ttl: int = None, key_prefix: str = "fastapi-cache", tags: list[str] = None):
    """
    Enhanced Redis caching decorator with metrics and tags.
    
    Args:
        ttl: Time to live in seconds (uses CACHE_DEFAULT_TTL if None)
        key_prefix: Prefix for cache keys
        tags: List of tags for grouped invalidation
    """
    if ttl is None:
        ttl = settings.CACHE_DEFAULT_TTL
        
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Skip cache if disabled
            if not settings.CACHE_ENABLED:
                return await func(*args, **kwargs)
            
            # Try to find 'request' in kwargs or args
            request: Optional[Request] = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            # If no request object found, skip cache
            if not request:
                if settings.ENABLE_CACHE_LOGGING:
                    logger.warning(f"Cache decorator on {func.__name__} without Request. Skipping cache.")
                return await func(*args, **kwargs)

            # Generate unique cache key
            user_id = "anonymous"
            current_user = kwargs.get("current_user")
            if current_user and hasattr(current_user, "id"):
                user_id = str(current_user.id)
            
            # Build key from URL and params
            url_path = request.url.path
            query_params = sorted(request.query_params.items())
            params_str = str(query_params)
            params_hash = hashlib.md5(params_str.encode()).hexdigest() if query_params else "no-params"
            
            # Include cache version in key
            cache_key = f"{key_prefix}:{CACHE_VERSION}:{user_id}:{url_path}:{params_hash}"
            
            redis = await get_cache_redis()
            
            # Try to get from cache
            start_time = time.time()
            try:
                cached_data = await redis.get(f"cache:{cache_key}")
                if cached_data:
                    CacheMetrics.record_hit()
                    if settings.ENABLE_CACHE_LOGGING:
                        elapsed = (time.time() - start_time) * 1000
                        logger.info(f"✅ Cache HIT [{elapsed:.2f}ms]: {cache_key[:80]}...")
                    return json.loads(cached_data)
            except Exception as e:
                CacheMetrics.record_error()
                logger.error(f"❌ Redis cache read error: {e}")

            # Cache miss - execute function
            CacheMetrics.record_miss()
            if settings.ENABLE_CACHE_LOGGING:
                logger.info(f"⚠️ Cache MISS: {cache_key[:80]}...")
            
            result = await func(*args, **kwargs)

            # Store in cache
            try:
                from fastapi.encoders import jsonable_encoder
                serializable_result = jsonable_encoder(result)
                
                # Store the cached value
                await redis.setex(
                    f"cache:{cache_key}",
                    ttl,
                    json.dumps(serializable_result)
                )
                
                # Store tags for this cache key (if provided)
                if tags:
                    for tag in tags:
                        tag_key = f"tag:{tag}"
                        await redis.sadd(tag_key, f"cache:{cache_key}")
                        await redis.expire(tag_key, ttl + 300)  # Tags live slightly longer
                
                if settings.ENABLE_CACHE_LOGGING:
                    logger.debug(f"💾 Cached with TTL={ttl}s, tags={tags}")
                    
            except Exception as e:
                CacheMetrics.record_error()
                logger.error(f"❌ Redis cache write error: {e}")

            return result
        return wrapper
    return decorator

async def invalidate_cache(key_pattern: str):
    """
    Invalidate cache keys matching a pattern.
    
    Args:
        key_pattern: Pattern to match (e.g., "fastapi-cache:user123:*")
    """
    redis = await get_cache_redis()
    try:
        keys = await redis.keys(f"cache:{key_pattern}*")
        if keys:
            await redis.delete(*keys)
            logger.info(f"🗑️ Invalidated {len(keys)} cache keys matching: {key_pattern}")
    except Exception as e:
        logger.error(f"Failed to invalidate cache: {e}")

async def invalidate_by_tags(tags: list[str]):
    """
    Invalidate all cache entries with the given tags.
    
    Args:
        tags: List of tags to invalidate
    """
    redis = await get_cache_redis()
    try:
        total_invalidated = 0
        for tag in tags:
            tag_key = f"tag:{tag}"
            # Get all cache keys with this tag
            cache_keys = await redis.smembers(tag_key)
            if cache_keys:
                # Delete the cache entries
                await redis.delete(*cache_keys)
                # Delete the tag set
                await redis.delete(tag_key)
                total_invalidated += len(cache_keys)
        
        if total_invalidated > 0:
            logger.info(f"🗑️ Invalidated {total_invalidated} cache entries for tags: {tags}")
    except Exception as e:
        logger.error(f"Failed to invalidate by tags: {e}")

async def get_cache_metrics() -> dict:
    """Get application cache metrics"""
    app_metrics = CacheMetrics.get_stats()
    
    # Get Redis stats
    redis = await get_cache_redis()
    try:
        info = await redis.info("stats")
        memory = await redis.info("memory")
        
        redis_metrics = {
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "used_memory_human": memory.get("used_memory_human", "0B"),
            "used_memory_peak_human": memory.get("used_memory_peak_human", "0B"),
            "evicted_keys": info.get("evicted_keys", 0),
            "expired_keys": info.get("expired_keys", 0)
        }
        
        # Calculate Redis hit rate
        total = redis_metrics["keyspace_hits"] + redis_metrics["keyspace_misses"]
        redis_hit_rate = (redis_metrics["keyspace_hits"] / total * 100) if total > 0 else 0
        redis_metrics["hit_rate"] = round(redis_hit_rate, 2)
        
        return {
            "application": app_metrics,
            "redis": redis_metrics
        }
    except Exception as e:
        logger.error(f"Failed to get cache metrics: {e}")
        return {"application": app_metrics, "redis": {}}
