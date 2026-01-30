import asyncio
from app.core.celery_app import celery_app
from app.core.db import init_db
import logging

logger = logging.getLogger(__name__)

# The worker initialization is handled at the task level via ensure_db() 
# to avoid race conditions on Windows with the solo pool.

logger.info("Celery worker starting...")

# Import tasks so they are registered
import app.tasks.lead_tasks
import app.tasks.email_tasks
