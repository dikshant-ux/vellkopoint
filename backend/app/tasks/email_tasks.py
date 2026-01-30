from app.core.celery_app import celery_app
from app.services.email_service import send_email_template, send_email
import asyncio
import logging

logger = logging.getLogger(__name__)

def run_async(coro):
    """Helper to run async code in a sync Celery task."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    if loop.is_running():
        return asyncio.ensure_future(coro, loop=loop)
    return loop.run_until_complete(coro)

@celery_app.task(name="app.tasks.email_tasks.send_email_task")
def send_email_task(email_to, subject, template_name, template_body):
    """
    Celery task to send emails asynchronously.
    """
    logger.info(f"Sending async email to {email_to} with subject: {subject}")
    try:
        run_async(send_email_template(email_to, subject, template_name, template_body))
        return {"status": "success", "to": email_to}
    except Exception as e:
        logger.error(f"Failed to send async email: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(name="app.tasks.email_tasks.send_raw_email_task")
def send_raw_email_task(to_email: str, subject: str, html_content: str):
    """
    Celery task to send raw HTML emails asynchronously.
    """
    logger.info(f"Sending async raw email to {to_email} with subject: {subject}")
    try:
        run_async(send_email(to_email, subject, html_content))
        return {"status": "success", "to": to_email}
    except Exception as e:
        logger.error(f"Failed to send async raw email: {e}")
        return {"status": "error", "message": str(e)}
