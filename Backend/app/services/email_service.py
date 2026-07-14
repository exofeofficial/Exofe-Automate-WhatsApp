"""
Email delivery via Resend.

Provides helper functions for every transactional email the app sends:
  - OTP login codes
  - Password-reset tokens
  - Email-verification tokens

All functions are fire-and-forget: failures are logged, never raised,
so the calling endpoint still returns a success response (prevents
email-enumeration side-channels).
"""

import resend

from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# ── Initialise Resend ────────────────────────────────────────────────────────

resend.api_key = settings.resend_api

_FROM = "Exofe <onboarding@resend.dev>"  # Use a verified domain in production


# ── HTML helpers ─────────────────────────────────────────────────────────────

def _base_html(title: str, body: str) -> str:
    """Wrap email body in a minimal branded HTML shell."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td>
          <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">{title}</h2>
          {body}
          <p style="margin:32px 0 0;font-size:12px;color:#a1a1aa;">
            — The Exofe Team
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Public API ───────────────────────────────────────────────────────────────

def send_otp_email(to: str, code: str) -> None:
    """Send a 6-digit OTP login code."""
    html = _base_html(
        "Your login code",
        f"""
        <p style="margin:16px 0 0;font-size:14px;color:#3f3f46;">
          Use this code to log in to your Exofe account. It expires in 5 minutes.
        </p>
        <div style="margin:24px 0;padding:16px;background:#f4f4f5;border-radius:8px;
                    text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">
          {code}
        </div>
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you didn't request this code, you can safely ignore this email.
        </p>""",
    )
    _send(to=to, subject=f"Your Exofe login code: {code}", html=html)


def send_password_reset_email(to: str, token: str) -> None:
    """Send a password-reset token."""
    html = _base_html(
        "Reset your password",
        f"""
        <p style="margin:16px 0 0;font-size:14px;color:#3f3f46;">
          We received a request to reset your password. Use the token below
          to complete the process. It expires in 1 hour.
        </p>
        <div style="margin:24px 0;padding:16px;background:#f4f4f5;border-radius:8px;
                    text-align:center;font-size:14px;font-family:monospace;word-break:break-all;color:#18181b;">
          {token}
        </div>
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>""",
    )
    _send(to=to, subject="Reset your Exofe password", html=html)


def send_verification_email(to: str, token: str) -> None:
    """Send an email-verification token after signup."""
    html = _base_html(
        "Verify your email",
        f"""
        <p style="margin:16px 0 0;font-size:14px;color:#3f3f46;">
          Thanks for signing up! Use the token below to verify your email address.
        </p>
        <div style="margin:24px 0;padding:16px;background:#f4f4f5;border-radius:8px;
                    text-align:center;font-size:14px;font-family:monospace;word-break:break-all;color:#18181b;">
          {token}
        </div>
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you didn't create an Exofe account, you can safely ignore this email.
        </p>""",
    )
    _send(to=to, subject="Verify your Exofe email", html=html)


# ── Internal ─────────────────────────────────────────────────────────────────

def _send(*, to: str, subject: str, html: str) -> None:
    """Fire-and-forget email via Resend. Logs on failure, never raises."""
    try:
        result = resend.Emails.send(
            {
                "from": _FROM,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        email_id = getattr(result, "id", None) or "?"
        logger.info("Email sent to %s — id=%s", to, email_id)
    except Exception:
        logger.exception("Failed to send email to %s (subject=%s)", to, subject)
