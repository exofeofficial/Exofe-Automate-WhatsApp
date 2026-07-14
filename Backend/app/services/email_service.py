# services/email_service.py
# Sends emails through Resend. If RESEND_API_KEY isn't set, we just log
# and skip instead of crashing, so local dev works fine without an
# account. Nothing here should ever break the request that triggered it,
# a failed email is not a reason to fail a waitlist signup or demo
# booking, so every send just logs and moves on if it fails.

import resend

from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


def _send(to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY not set, skipping email to %s (%s)", to, subject)
        return

    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send(
            {
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
    except Exception:
        logger.exception("Failed to send email to %s", to)


def send_waitlist_email(to: str) -> None:
    _send(
        to,
        subject="You're on the Exofe waitlist",
        html="""
            <p>Thanks for joining the Exofe waitlist.</p>
            <p>We'll email you as soon as a spot opens up.</p>
        """,
    )


def send_demo_confirmation_email(to: str, name: str) -> None:
    _send(
        to,
        subject="Your Exofe demo request",
        html=f"""
            <p>Hi {name},</p>
            <p>Thanks for booking a demo with Exofe. Our team will reach out shortly
            to find a time that works for you.</p>
        """,
    )
