from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_CELERY_URL,  # Use dedicated Celery Redis
    backend=settings.REDIS_CELERY_URL
)

# Task routing - disabled for development (Windows solo pool compatibility)
# For production, uncomment and start workers with: celery -A app.worker worker -Q queue_name
# celery_app.conf.task_routes = {
#     'app.tasks.email_tasks.*': {'queue': 'emails'},
#     'app.tasks.lead_tasks.process_lead': {'queue': 'leads'},
#     'app.tasks.lead_tasks.*': {'queue': 'default'},
# }

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Result expiration - clean up old task results
    result_expires=3600,  # 1 hour
    
    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completion
    task_reject_on_worker_lost=True,  # Reject tasks if worker crashes
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Time limits
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,  # 10 minutes hard limit
    
    # Worker settings
    worker_prefetch_multiplier=4,  # Prefetch 4 tasks per worker
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Autodiscover tasks in the tasks directory
celery_app.autodiscover_tasks(["app.tasks.lead_tasks", "app.tasks.email_tasks"])
