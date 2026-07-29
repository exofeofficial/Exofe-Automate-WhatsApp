import hashlib
import hmac

import httpx

from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

GRAPH_API_VERSION = "v21.0"


def send_text_message(to: str, text: str) -> None:
    """Send a plain-text WhatsApp message via the Cloud API.

    Uses the platform-level token/phone number id — fine while only
    Exofe's own WhatsApp number is connected. Once real tenants connect
    their own numbers via Embedded Signup, this needs to take a
    per-business token/phone_number_id instead of the global settings.
    """
    if not settings.whatsapp_cloud_api_token or not settings.whatsapp_phone_number_id:
        logger.error("WhatsApp send skipped: WHATSAPP_CLOUD_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured")
        return

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{settings.whatsapp_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }
    headers = {"Authorization": f"Bearer {settings.whatsapp_cloud_api_token}"}

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
    except httpx.HTTPError as e:
        logger.error(f"Failed to send WhatsApp message to {to}: {e}")


def verify_signature(payload_body: bytes, signature_header: str | None) -> bool:
    """Confirm a webhook POST actually came from Meta, via the app secret's
    HMAC-SHA256 over the raw body. Skips the check (with a warning) if no
    app secret is configured yet, so the webhook still works before that's
    set up in the Meta dashboard."""
    if not settings.whatsapp_app_secret:
        logger.warning("WHATSAPP_APP_SECRET not configured — skipping webhook signature verification")
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(settings.whatsapp_app_secret.encode(), payload_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))
