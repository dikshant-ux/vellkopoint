from app.models.system_field import SystemField
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.core.redis_manager import get_cache_redis
from app.utils.cache_tags import *
import logging

logger = logging.getLogger(__name__)

async def warm_system_fields(owner_id: str):
    """Pre-populate system fields cache for a user"""
    try:
        from app.utils.cache import cache
        from fastapi.encoders import jsonable_encoder
        import json
        
        fields = await SystemField.find(SystemField.owner_id == owner_id).to_list(None)
        
        # Manually cache the result
        redis = await get_cache_redis()
        cache_key = f"cache:fastapi-cache:v1:{owner_id}:/api/v1/system-fields/:no-params"
        
        serializable = jsonable_encoder(fields)
        await redis.setex(cache_key, 3600, json.dumps(serializable))
        
        logger.info(f"🔥 Warmed system fields cache for user {owner_id}: {len(fields)} fields")
    except Exception as e:
        logger.error(f"Failed to warm system fields cache: {e}")

async def warm_vendors(owner_id: str = None):
    """Pre-populate vendors cache"""
    try:
        from fastapi.encoders import jsonable_encoder
        import json
        
        vendors = await Vendor.find_all().to_list(None)
        
        redis = await get_cache_redis()
        cache_key = f"cache:fastapi-cache:v1:anonymous:/api/v1/vendors/:no-params"
        
        serializable = jsonable_encoder(vendors)
        await redis.setex(cache_key, 3600, json.dumps(serializable))
        
        logger.info(f"🔥 Warmed vendors cache: {len(vendors)} vendors")
    except Exception as e:
        logger.error(f"Failed to warm vendors cache: {e}")

async def warm_customers(owner_id: str = None):
    """Pre-populate customers cache"""
    try:
        from fastapi.encoders import jsonable_encoder
        import json
        
        customers = await Customer.find_all().to_list(None)
        
        redis = await get_cache_redis()
        cache_key = f"cache:fastapi-cache:v1:anonymous:/api/v1/customers/:no-params"
        
        serializable = jsonable_encoder(customers)
        await redis.setex(cache_key, 3600, json.dumps(serializable))
        
        logger.info(f"🔥 Warmed customers cache: {len(customers)} customers")
    except Exception as e:
        logger.error(f"Failed to warm customers cache: {e}")

async def warm_all_caches():
    """Warm all frequently accessed caches on startup"""
    logger.info("🔥 Starting cache warming...")
    
    try:
        # Warm common caches
        await warm_vendors()
        await warm_customers()
        
        # Note: User-specific caches (system fields) are warmed on first user request
        
        logger.info("✅ Cache warming completed")
    except Exception as e:
        logger.error(f"❌ Cache warming failed: {e}")
