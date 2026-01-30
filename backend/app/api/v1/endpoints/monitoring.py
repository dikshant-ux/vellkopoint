from fastapi import APIRouter, Depends, HTTPException
from app.core.redis_manager import redis_manager
from app.utils.cache import get_cache_metrics
from app.api import deps
from app.models.user import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Comprehensive health check for all services
    """
    redis_health = await redis_manager.health_check()
    
    # Overall health status
    all_healthy = all(redis_health.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": {
            "redis_cache": "up" if redis_health["cache"] else "down",
            "redis_celery": "up" if redis_health["celery"] else "down",
            "redis_session": "up" if redis_health["session"] else "down"
        }
    }

@router.get("/cache-stats")
async def cache_statistics(current_user: User = Depends(deps.get_current_user)):
    """
    Get cache performance statistics
    Requires authentication
    """
    try:
        metrics = await get_cache_metrics()
        redis_stats = await redis_manager.get_cache_stats()
        
        return {
            "application_metrics": metrics.get("application", {}),
            "redis_metrics": redis_stats,
            "recommendations": _get_cache_recommendations(metrics, redis_stats)
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve cache statistics")

@router.get("/celery-stats")
async def celery_statistics(current_user: User = Depends(deps.get_current_user)):
    """
    Get Celery queue statistics
    Requires authentication
    """
    try:
        from app.core.celery_app import celery_app
        
        # Get active tasks
        inspect = celery_app.control.inspect()
        active = inspect.active()
        scheduled = inspect.scheduled()
        reserved = inspect.reserved()
        
        # Count tasks
        active_count = sum(len(tasks) for tasks in (active or {}).values())
        scheduled_count = sum(len(tasks) for tasks in (scheduled or {}).values())
        reserved_count = sum(len(tasks) for tasks in (reserved or {}).values())
        
        return {
            "active_tasks": active_count,
            "scheduled_tasks": scheduled_count,
            "reserved_tasks": reserved_count,
            "total_pending": active_count + scheduled_count + reserved_count,
            "workers": list((active or {}).keys()),
            "status": "healthy" if active_count < 100 else "warning"
        }
    except Exception as e:
        logger.error(f"Failed to get Celery stats: {e}")
        return {
            "error": "Celery inspection failed",
            "message": str(e),
            "status": "unavailable"
        }

@router.get("/redis-info")
async def redis_information(current_user: User = Depends(deps.get_current_user)):
    """
    Get detailed Redis connection information
    Requires authentication
    """
    try:
        from app.core.redis_manager import get_cache_redis
        
        redis = await get_cache_redis()
        info = await redis.info()
        
        return {
            "version": info.get("redis_version"),
            "uptime_days": info.get("uptime_in_days"),
            "connected_clients": info.get("connected_clients"),
            "used_memory_human": info.get("used_memory_human"),
            "used_memory_peak_human": info.get("used_memory_peak_human"),
            "total_commands_processed": info.get("total_commands_processed"),
            "instantaneous_ops_per_sec": info.get("instantaneous_ops_per_sec"),
            "role": info.get("role")
        }
    except Exception as e:
        logger.error(f"Failed to get Redis info: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve Redis information")

def _get_cache_recommendations(app_metrics: dict, redis_stats: dict) -> list[str]:
    """Generate cache optimization recommendations"""
    recommendations = []
    
    app_data = app_metrics.get("application", {})
    hit_rate = app_data.get("hit_rate", 0)
    
    if hit_rate < 50:
        recommendations.append("⚠️ Low cache hit rate. Consider increasing TTL or warming more caches.")
    elif hit_rate > 90:
        recommendations.append("✅ Excellent cache hit rate!")
    
    evicted = redis_stats.get("evicted_keys", 0)
    if evicted > 1000:
        recommendations.append("⚠️ High eviction rate. Consider increasing CACHE_MAX_MEMORY.")
    
    if not recommendations:
        recommendations.append("✅ Cache performance looks good!")
    
    return recommendations
