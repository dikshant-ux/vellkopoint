from typing import List, Dict, Any
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.core.config import settings
from pathlib import Path

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
    # In a real app we'd use Jinja2 templates. For now we'll construct a simple body.
    # This is a placeholder for a more robust template system
    
    html_content = f"""
    <html>
        <body>
            <h1>{subject}</h1>
            <p>Hello,</p>
            <p>{template_body.get('message', '')}</p>
            <br>
            <a href="{template_body.get('link', '#')}">{template_body.get('link_text', 'Click here')}</a>
            <br>
            <p>Best regards,<br>{settings.PROJECT_NAME}</p>
        </body>
    </html>
    """

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
    link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
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
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
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
    from app.tasks.email_tasks import send_raw_email_task
    
    # Frontend URL for accepting invitation
    invitation_url = f"{settings.FRONTEND_URL}/accept-invitation?token={invitation_token}"
    
    html_content = f"""
    <html>
        <body>
            <h2>Welcome to Waypoint!</h2>
            <p>Hi {full_name},</p>
            <p>You've been invited to join Waypoint by {invited_by} as a <strong>{role}</strong>.</p>
            <p>Click the link below to accept your invitation and set your password:</p>
            <p><a href="{invitation_url}">Accept Invitation</a></p>
            <p>This invitation will expire in 24 hours.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <br>
            <p>Best regards,<br>Waypoint Team</p>
        </body>
    </html>
    """
    
    send_raw_email_task.delay(
        to_email=email,
        subject="You've been invited to Waypoint",
        html_content=html_content
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
    from app.tasks.email_tasks import send_raw_email_task
    
    html_content = f"""
    <html>
        <body>
            <h2>New Destination Approval Required</h2>
            <p>Hi {admin_name},</p>
            <p>User <strong>{requester_email}</strong> has created a new destination that requires approval:</p>
            <ul>
                <li><strong>Destination Name:</strong> {destination_name}</li>
                <li><strong>Type:</strong> {destination_type}</li>
                <li><strong>URL:</strong> {destination_url}</li>
                <li><strong>Customer:</strong> {customer_name}</li>
            </ul>
            <p>Please review and approve/reject this destination in the dashboard or use the buttons below:</p>
            
            <div style="margin: 30px 0;">
                <a href="{approve_link}" 
                   style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px; font-weight: bold;">
                   Approve Destination
                </a>
                
                <a href="{reject_link}" 
                   style="background-color: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                   Reject
                </a>
            </div>
            
            <p style="font-size: 12px; color: #64748b;">If you are not an admin or this was sent in error, please ignore this email.</p>
            <br>
            <p>Best regards,<br>Waypoint Team</p>
        </body>
    </html>
    """
    
    send_raw_email_task.delay(
        to_email=admin_email,
        subject="New Destination Approval Required",
        html_content=html_content
    )


async def send_destination_approved_email(
    requester_email: str,
    destination_name: str,
    approver_email: str
):
    from app.tasks.email_tasks import send_raw_email_task
    
    html_content = f"""
    <html>
        <body>
            <h2>Destination Approved</h2>
            <p>Hi,</p>
            <p>Your destination <strong>{destination_name}</strong> has been approved by {approver_email}.</p>
            <p>You can now use this destination in your campaigns.</p>
            <br>
            <p>Best regards,<br>Waypoint Team</p>
        </body>
    </html>
    """
    
    send_raw_email_task.delay(
        to_email=requester_email,
        subject="Destination Approved",
        html_content=html_content
    )


async def send_destination_rejected_email(
    requester_email: str,
    destination_name: str,
    rejecter_email: str,
    reason: str
):
    from app.tasks.email_tasks import send_raw_email_task
    
    html_content = f"""
    <html>
        <body>
            <h2>Destination Rejected</h2>
            <p>Hi,</p>
            <p>Your destination <strong>{destination_name}</strong> has been rejected by {rejecter_email}.</p>
            <p><strong>Reason:</strong> {reason}</p>
            <p>Please review the details and submit a new request if needed.</p>
            <br>
            <p>Best regards,<br>Waypoint Team</p>
        </body>
    </html>
    """
    
    send_raw_email_task.delay(
        to_email=requester_email,
        subject="Destination Rejected",
        html_content=html_content
    )
