import resend

from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# ── Initialise Resend ────────────────────────────────────────────────────────

resend.api_key = settings.resend_api_key

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


def send_password_reset_email(to: str, code: str) -> None:
    """Send a 6-digit password-reset code."""
    html = _base_html(
        "Reset your password",
        f"""
        <p style="margin:16px 0 0;font-size:14px;color:#3f3f46;">
          We received a request to reset your password. Use this code to
          complete the process. It expires in 5 minutes.
        </p>
        <div style="margin:24px 0;padding:16px;background:#f4f4f5;border-radius:8px;
                    text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">
          {code}
        </div>
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>""",
    )
    _send(to=to, subject="Reset your Exofe password", html=html)

def send_team_invite_email(to: str, business_name: str, token: str) -> None:
    """Send a team invite with a clickable link to /accept-invite?token=...
    — GET /auth/invite/{token} shows who invited them before they submit
    anything, POST /auth/accept-invite sets their name/password and logs
    them straight into the dashboard. The link is valid for 7 days (see
    team_service.INVITE_TOKEN_TTL_DAYS)."""
    accept_url = f"{settings.frontend_url}/accept-invite?token={token}"
    html = _base_html(
        "You've been invited",
        f"""
        <p style="margin:16px 0 0;font-size:14px;color:#3f3f46;">
          You've been invited to join <strong>{business_name}</strong> on Exofe.
          Click below to set up your account — this link is valid for 7 days.
        </p>
        <div style="margin:24px 0;text-align:center;">
          <a href="{accept_url}"
             style="display:inline-block;padding:12px 28px;background:#5B4FE9;color:#ffffff;
                    font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
            Accept invite
          </a>
        </div>
        <p style="margin:0 0 16px;font-size:12px;color:#a1a1aa;word-break:break-all;">
          Or paste this link into your browser: {accept_url}
        </p>
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you weren't expecting this invite, you can safely ignore this email.
        </p>""",
    )
    _send(to=to, subject=f"You've been invited to join {business_name} on Exofe", html=html)


def send_verification_email(to: str, code: str) -> None:
    """Send a 6-digit email-verification code after signup."""
    html = _base_html(
        "Verify your email",
        f"""
        <p style="margin:16px 0 0;font-size:14px;color:#3f3f46;">
          Thanks for signing up! Enter this code to verify your email address.
          It expires in 30 minutes.
        </p>
        <div style="margin:24px 0;padding:16px;background:#f4f4f5;border-radius:8px;
                    text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;">
          {code}
        </div>
        <p style="margin:0;font-size:12px;color:#a1a1aa;">
          If you didn't create an Exofe account, you can safely ignore this email.
        </p>""",
    )
    _send(to=to, subject=f"Your Exofe verification code: {code}", html=html)


def send_waitlist_email(to: str) -> None:
    _send(
        to=to,
        subject="You're on the Exofe waitlist",
        html="""
            <p>Thanks for joining the Exofe waitlist.</p>
            <p>We'll email you as soon as a spot opens up.</p>
        """,
    )


def send_demo_confirmation_email(to: str, name: str) -> None:
    _send(
        to=to,
        subject="Your Exofe demo request",
        html=f"""
            <p>Hi {name},</p>
            <p>Thanks for booking a demo with Exofe. Our team will reach out shortly
            to find a time that works for you.</p>
        """)

# ── Internal ─────────────────────────────────────────────────────────────────

def _send(*, to: str, subject: str, html: str) -> None:
    """Fire-and-forget email via Resend. Logs on failure, never raises."""
    if not settings.resend_api_key:
        logger.info("RESEND_API_KEY not set, skipping email to %s (%s)", to, subject)
        return

    try:
        result = resend.Emails.send(
            {
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        email_id = getattr(result, "id", None) or "?"
        logger.info("Email sent to %s — id=%s", to, email_id)
    except Exception:
        logger.exception("Failed to send email to %s (subject=%s)", to, subject)