import asyncio
from typing import Dict, Any, Optional
from celery import shared_task
from app.core.celery_app import celery_app
from app.core.celery_app import celery_app
# Avoid top-level service imports to prevent circular dependencies
# from app.services.processing_engine import ProcessingEngine
# from app.services.routing_engine import RoutingEngine
# from app.services.analytics import AnalyticsEngine
# Avoid top-level model imports to prevent early initialization issues
# from app.models.vendor import Vendor
# from app.models.lead import Lead
import logging

logger = logging.getLogger(__name__)

_db_initialized = False

async def ensure_db():
    global _db_initialized
    if not _db_initialized:
        from app.core.db import init_db
        try:
            logger.info("Initializing DB connection for task...")
            await init_db()
            _db_initialized = True
            logger.info("DB connection initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database in task: {e}")
            raise

def run_async(coro):
    """Helper to run async coroutines in synchronous celery tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_running():
        return asyncio.ensure_future(coro, loop=loop)
    return loop.run_until_complete(coro)

@celery_app.task(name="app.tasks.lead_tasks.process_lead_task")
def process_lead_task(payload: Dict[str, Any], source_id: str, vendor_id: str, owner_id: str, tenant_id: str):
    """
    Background task to process an ingested lead.
    """
    logger.info(f"Processing lead for source {source_id}")
    
    async def _process():
        await ensure_db()
        from app.models.vendor import Vendor
        from app.utils.cache import invalidate_cache
        from app.services.processing_engine import ProcessingEngine
        from app.services.analytics import AnalyticsEngine

        # 1. Fetch source/vendor
        vendor = await Vendor.get(vendor_id)
        if not vendor:
            logger.error(f"Vendor {vendor_id} not found")
            return
        
        source = next((s for s in vendor.sources if s.id == source_id), None)
        if not source:
            logger.error(f"Source {source_id} not found in vendor {vendor_id}")
            return
        
        # 2. Process through engine
        processed_data = await ProcessingEngine.process_record(payload, source, owner_id, tenant_id, vendor_id=vendor_id)
        
        # 3. If not rejected, trigger routing
        if not processed_data.get("_rejected") and processed_data.get("_lead_id"):
            route_lead_task.delay(processed_data["_lead_id"])
            
        # 4. Log Event
        await AnalyticsEngine.log_event(
            "ingest",
            source.id,
            owner_id=owner_id,
            vendor_id=vendor_id,
            meta={
                "status": "processed" if not processed_data.get("_rejected") else "rejected",
                "reason": processed_data.get("_rejection_reason"),
                "lead_id": processed_data.get("_lead_id")
            }
        )
        
        # 5. Invalidate analytics cache so dashboard updates immediately
        await invalidate_cache(f"fastapi-cache:*:{owner_id}:/api/v1/analytics/stats:*")
        logger.info(f"Invalidated analytics cache for user {owner_id}")
        
    return run_async(_process())

@celery_app.task(name="app.tasks.lead_tasks.route_lead_task")
def route_lead_task(lead_id: str):
    """
    Background task to route a lead to active campaigns.
    """
    logger.info(f"Routing lead {lead_id}")
    
    async def _route():
        await ensure_db()
        from app.services.routing_engine import RoutingEngine
        await RoutingEngine.execute_routing(lead_id)
        
    return run_async(_route())

@celery_app.task(name="app.tasks.lead_tasks.log_event_task")
def log_event_task(event_type: str, source_id: str, owner_id: str, vendor_id: str, meta: Dict[str, Any]):
    """
    Background task for logging analytics events.
    """
    async def _log():
        await ensure_db()
        from app.services.analytics import AnalyticsEngine
        await AnalyticsEngine.log_event(
            event_type,
            source_id,
            owner_id=owner_id,
            vendor_id=vendor_id,
            meta=meta
        )
    return run_async(_log())

@celery_app.task(name="app.tasks.lead_tasks.reprocess_source_leads_task")
def reprocess_source_leads_task(source_id: str, tenant_id: str):
    """
    Background task to re-apply mapping and normalization to all leads of a source.
    Uses original_payload to reconstruct data.
    """
    logger.info(f"Reprocessing leads for source {source_id}")
    
    async def _reprocess():
        await ensure_db()
        from app.models.lead import Lead
        from app.models.vendor import Vendor
        from app.services.processing_engine import ProcessingEngine
        
        # 1. Fetch Source
        vendor = await Vendor.find_one({"sources.id": source_id, "tenant_id": tenant_id})
        if not vendor:
            logger.error(f"Vendor for source {source_id} not found")
            return

        source = next((s for s in vendor.sources if s.id == source_id), None)
        if not source:
            logger.error(f"Source {source_id} not found")
            return
            
        # 2. Iterate all leads for this source
        # Use find() with async for loop to stream results
        async for lead in Lead.find(Lead.source_id == source_id, Lead.tenant_id == tenant_id):
            try:
                if not lead.original_payload:
                    continue
                    
                # 3. Re-Map
                mapped = await ProcessingEngine.apply_mapping(
                    lead.original_payload, 
                    source.mapping, 
                    source.id, 
                    lead.owner_id, 
                    lead.tenant_id,
                    vendor_id=str(vendor.id),
                    auto_discover=False # Don't create new rules during reprocessing
                )
                
                # 4. Re-Normalize
                normalized = ProcessingEngine.apply_normalization(mapped, source.normalization)
                
                # 5. Update Lead
                # Preserve system fields if needed, but here we are fully resetting 'data' 
                # based on current config + original payload.
                # Use shallow update to data field
                lead.data = normalized
                
                # Sanitize language field again just in case
                if "language" in lead.data:
                    lead.data["source_language"] = lead.data.pop("language")
                    
                await lead.save()
                
            except Exception as e:
                logger.error(f"Failed to reprocess lead {lead.id}: {e}")
        
        logger.info(f"Finished reprocessing leads for source {source_id}")

    return run_async(_reprocess())

@celery_app.task(name="app.tasks.lead_tasks.cleanup_old_payloads_task")
def cleanup_old_payloads_task():
    """
    Background task to remove 'original_payload' from leads older than 30 days.
    This runs daily to save storage space.
    """
    logger.info("Starting cleanup of old lead payloads")
    
    async def _cleanup():
        await ensure_db()
        from app.models.lead import Lead
        from datetime import datetime, timedelta
        
        # 30 days ago
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        # Find leads created before cutoff that still have original_payload
        # Using separate query for count to log stats
        query = {
            "created_at": {"$lt": cutoff_date},
            "original_payload": {"$ne": None}
        }
        
        try:
            # Efficiently unset the field for all matching docs
            # Beanie/Motor 'update_many' wrapper
            result = await Lead.find(query).update({"$unset": {"original_payload": ""}})
            
            logger.info(f"Cleanup finished. Removed payload from {result.modified_count} leads older than {cutoff_date.isoformat()}")
        except Exception as e:
            logger.error(f"Failed to cleanup old payloads: {e}")

    return run_async(_cleanup())
