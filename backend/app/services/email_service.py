from typing import List, Dict, Any
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.core.config import settings
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.EMAILS_FROM_EMAIL,
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_SERVER,
    MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

fastmail = FastMail(conf)

# Setup Jinja2 environment
template_env = Environment(loader=FileSystemLoader(Path(__file__).parent.parent / "templates"))

async def send_email(
    to_email: str,
    subject: str,
    html_content: str
):
    """
    Send email with custom HTML content.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
    """
    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=html_content,
        subtype=MessageType.html
    )

    if not settings.SMTP_SERVER or not settings.SMTP_USER:
        print(f"MOCK EMAIL TO {to_email}: {subject}")
        print(f"Content: {html_content[:200]}...")
        return

    try:
        await fastmail.send_message(message)
    except Exception as e:
        print(f"Error sending email: {e}")
        # In development, we can just log it and proceed
        if settings.ENVIRONMENT == "development":
            return
        raise e


async def send_email_template(
    email_to: List[EmailStr],
    subject: str,
    template_name: str,
    template_body: Dict[str, Any]
):
    template = template_env.get_template(template_name)
    
    # Add project_name to context if not present
    if "project_name" not in template_body:
        template_body["project_name"] = settings.PROJECT_NAME
        
    html_content = template.render(**template_body)

    message = MessageSchema(
        subject=subject,
        recipients=email_to,
        body=html_content,
        subtype=MessageType.html
    )

    if not settings.SMTP_SERVER or not settings.SMTP_USER:
        print(f"MOCK EMAIL TO {email_to}: {subject} | LINK: {template_body.get('link')}")
        return

    try:
        await fastmail.send_message(message)
    except Exception as e:
        print(f"Error sending email: {e}")
        # In development, we can just log it and proceed
        if settings.ENVIRONMENT == "development":
            return
        raise e

async def send_verification_email(email_to: EmailStr, token: str):
    from app.tasks.email_tasks import send_email_task
    link = f"{settings.get_public_frontend_url}/verify-email?token={token}"
    send_email_task.delay(
        email_to=[email_to],
        subject=f"Verify your {settings.PROJECT_NAME} account",
        template_name="verification.html",
        template_body={
            "message": "Please click the link below to verify your email address.",
            "link": link,
            "link_text": "Verify Email"
        }
    )

async def send_reset_password_email(email_to: EmailStr, token: str):
    from app.tasks.email_tasks import send_email_task
    link = f"{settings.get_public_frontend_url}/reset-password?token={token}"
    send_email_task.delay(
        email_to=[email_to],
        subject="Password Reset Request",
        template_name="reset_password.html",
        template_body={
            "message": "You requested a password reset. Click the link below to set a new password. If you didn't request this, please ignore this email.",
            "link": link,
            "link_text": "Reset Password"
        }
    )


async def send_invitation_email(
    email: str,
    full_name: str,
    invitation_token: str,
    invited_by: str,
    role: str
):
    from app.tasks.email_tasks import send_email_task
    
    # Frontend URL for accepting invitation
    invitation_url = f"{settings.get_public_frontend_url}/accept-invitation?token={invitation_token}"
    
    send_email_task.delay(
        email_to=[email],
        subject="You've been invited to Waypoint",
        template_name="invitation.html",
        template_body={
            "full_name": full_name,
            "invited_by": invited_by,
            "role": role,
            "invitation_url": invitation_url
        }
    )


async def send_destination_submitted_email(
    admin_email: str,
    admin_name: str,
    requester_email: str,
    destination_name: str,
    destination_type: str,
    destination_url: str,
    customer_name: str,
    approve_link: str,
    reject_link: str
):
    from app.tasks.email_tasks import send_email_task
    
    send_email_task.delay(
        email_to=[admin_email],
        subject="New Destination Approval Required",
        template_name="destination_submitted.html",
        template_body={
            "admin_name": admin_name,
            "requester_email": requester_email,
            "destination_name": destination_name,
            "destination_type": destination_type,
            "destination_url": destination_url,
            "customer_name": customer_name,
            "approve_link": approve_link,
            "reject_link": reject_link
        }
    )


async def send_destination_approved_email(
    requester_email: str,
    destination_name: str,
    approver_email: str
):
    from app.tasks.email_tasks import send_email_task
    
    send_email_task.delay(
        email_to=[requester_email],
        subject="Destination Approved",
        template_name="destination_approved.html",
        template_body={
            "destination_name": destination_name,
            "approver_email": approver_email
        }
    )


async def send_destination_rejected_email(
    requester_email: str,
    destination_name: str,
    rejecter_email: str,
    reason: str
):
    from app.tasks.email_tasks import send_email_task
    
    send_email_task.delay(
        email_to=[requester_email],
        subject="Destination Rejected",
        template_name="destination_rejected.html",
        template_body={
            "destination_name": destination_name,
            "rejecter_email": rejecter_email,
            "reason": reason
        }
    )
