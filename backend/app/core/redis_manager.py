import redis.asyncio as redis
from typing import Optional
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisManager:
    """Manages multiple Redis connections for different purposes"""
    
    def __init__(self):
        self._cache_client: Optional[redis.Redis] = None
        self._celery_client: Optional[redis.Redis] = None
        self._session_client: Optional[redis.Redis] = None
        
    async def get_cache_redis(self) -> redis.Redis:
        """Get Redis client for application cache"""
        if self._cache_client is None:
            self._cache_client = await redis.from_url(
                settings.REDIS_CACHE_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=50,
                socket_connect_timeout=5,
                socket_keepalive=True,
                retry_on_timeout=True
            )
            logger.info(f"✅ Cache Redis connected: {settings.REDIS_CACHE_URL}")
            
            # Configure maxmemory and eviction policy
            try:
                await self._cache_client.config_set('maxmemory', settings.CACHE_MAX_MEMORY)
                await self._cache_client.config_set('maxmemory-policy', settings.CACHE_EVICTION_POLICY)
                logger.info(f"📊 Cache Redis configured: maxmemory={settings.CACHE_MAX_MEMORY}, policy={settings.CACHE_EVICTION_POLICY}")
            except Exception as e:
                logger.warning(f"⚠️ Could not set Redis config (may require admin): {e}")
                
        return self._cache_client
    
    async def get_celery_redis(self) -> redis.Redis:
        """Get Redis client for Celery broker/results"""
        if self._celery_client is None:
            self._celery_client = await redis.from_url(
                settings.REDIS_CELERY_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                socket_connect_timeout=5,
                socket_keepalive=True,
                retry_on_timeout=True
            )
            logger.info(f"✅ Celery Redis connected: {settings.REDIS_CELERY_URL}")
        return self._celery_client
    
    async def get_session_redis(self) -> redis.Redis:
        """Get Redis client for user sessions"""
        if self._session_client is None:
            self._session_client = await redis.from_url(
                settings.REDIS_SESSION_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=30,
                socket_connect_timeout=5,
                socket_keepalive=True,
                retry_on_timeout=True
            )
            logger.info(f"✅ Session Redis connected: {settings.REDIS_SESSION_URL}")
        return self._session_client
    
    async def health_check(self) -> dict:
        """Check health of all Redis connections"""
        health = {
            "cache": False,
            "celery": False,
            "session": False
        }
        
        try:
            cache = await self.get_cache_redis()
            await cache.ping()
            health["cache"] = True
        except Exception as e:
            logger.error(f"❌ Cache Redis health check failed: {e}")
        
        try:
            celery = await self.get_celery_redis()
            await celery.ping()
            health["celery"] = True
        except Exception as e:
            logger.error(f"❌ Celery Redis health check failed: {e}")
        
        try:
            session = await self.get_session_redis()
            await session.ping()
            health["session"] = True
        except Exception as e:
            logger.error(f"❌ Session Redis health check failed: {e}")
        
        return health
    
    async def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        try:
            cache = await self.get_cache_redis()
            info = await cache.info("stats")
            memory = await cache.info("memory")
            
            return {
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(
                    info.get("keyspace_hits", 0),
                    info.get("keyspace_misses", 0)
                ),
                "used_memory_human": memory.get("used_memory_human", "0B"),
                "used_memory_peak_human": memory.get("used_memory_peak_human", "0B"),
                "evicted_keys": info.get("evicted_keys", 0),
                "expired_keys": info.get("expired_keys", 0)
            }
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {}
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate percentage"""
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)
    
    async def close_all(self):
        """Close all Redis connections gracefully"""
        if self._cache_client:
            await self._cache_client.close()
            logger.info("🔌 Cache Redis connection closed")
        if self._celery_client:
            await self._celery_client.close()
            logger.info("🔌 Celery Redis connection closed")
        if self._session_client:
            await self._session_client.close()
            logger.info("🔌 Session Redis connection closed")

# Global instance
redis_manager = RedisManager()

# Convenience functions
async def get_cache_redis() -> redis.Redis:
    """Get cache Redis client"""
    return await redis_manager.get_cache_redis()

async def get_celery_redis() -> redis.Redis:
    """Get Celery Redis client"""
    return await redis_manager.get_celery_redis()

async def get_session_redis() -> redis.Redis:
    """Get session Redis client"""
    return await redis_manager.get_session_redis()
