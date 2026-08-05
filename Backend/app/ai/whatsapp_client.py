import hashlib
import hmac

import httpx

from app.config import settings
from app.core.exceptions import AppError
from app.core.logger import get_logger

logger = get_logger(__name__)

GRAPH_API_VERSION = "v21.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


def _send(payload: dict, to: str, *, phone_number_id: str | None, access_token: str | None) -> None:
    """Shared POST to /{phone_number_id}/messages — every message type
    (text, list, buttons) is just a different `payload` shape.

    Takes the sending business's own phone_number_id/access_token once a
    business has connected via Embedded Signup or manual setup. Falls
    back to the platform-level settings values so Exofe's own
    already-working connection (set up before per-business columns
    existed) keeps working unchanged.
    """
    phone_number_id = phone_number_id or settings.whatsapp_phone_number_id
    access_token = access_token or settings.whatsapp_cloud_api_token

    if not access_token or not phone_number_id:
        logger.error("WhatsApp send skipped: no access token / phone number id available")
        return

    url = f"{GRAPH_API_BASE}/{phone_number_id}/messages"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {"messaging_product": "whatsapp", "to": to, **payload}

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
    except httpx.HTTPError as e:
        detail = _meta_error_message(e.response) if isinstance(e, httpx.HTTPStatusError) else str(e)
        logger.error(f"Failed to send WhatsApp message to {to}: {detail}")


def send_text_message(to: str, text: str, *, phone_number_id: str | None = None, access_token: str | None = None) -> None:
    """Send a plain-text WhatsApp message via the Cloud API."""
    _send({"type": "text", "text": {"body": text}}, to, phone_number_id=phone_number_id, access_token=access_token)


def send_list_message(
    to: str,
    *,
    body: str,
    button_text: str,
    rows: list[dict],
    phone_number_id: str | None = None,
    access_token: str | None = None,
) -> None:
    """Send an interactive List Message — up to 10 rows, each
    {id, title, description?}. Used for category selection: the
    customer taps the list instead of typing a category name."""
    _send(
        {
            "type": "interactive",
            "interactive": {
                "type": "list",
                "body": {"text": body},
                "action": {"button": button_text, "sections": [{"rows": rows}]},
            },
        },
        to,
        phone_number_id=phone_number_id,
        access_token=access_token,
    )


def send_button_message(
    to: str,
    *,
    body: str,
    buttons: list[dict],
    phone_number_id: str | None = None,
    access_token: str | None = None,
) -> None:
    """Send up to 3 Reply Buttons — each {id, title} (title max 20 chars,
    a WhatsApp API limit). Used for 'Next product' / 'Select this one'
    style choices while browsing."""
    _send(
        {
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {
                    "buttons": [{"type": "reply", "reply": {"id": b["id"], "title": b["title"][:20]}} for b in buttons]
                },
            },
        },
        to,
        phone_number_id=phone_number_id,
        access_token=access_token,
    )


def send_template_message(
    to: str,
    *,
    template_name: str,
    language: str,
    parameters: list[str],
    phone_number_id: str | None = None,
    access_token: str | None = None,
) -> None:
    """Send an approved Business Message Template — the only way to
    reach a customer who hasn't messaged us in the last 24h (unlike
    send_text_message/send_list_message/send_button_message above, which
    only work inside that live-conversation window)."""
    _send(
        {
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": p} for p in parameters],
                    }
                ]
                if parameters
                else [],
            },
        },
        to,
        phone_number_id=phone_number_id,
        access_token=access_token,
    )


def create_message_template(
    waba_id: str,
    access_token: str,
    *,
    name: str,
    category: str,
    language: str,
    body_text: str,
    variable_examples: list[str],
) -> dict:
    """Submits a template for Meta's review under this business's own
    WABA — templates aren't shared across WABAs, so every business that
    activates a starter template gets its own copy submitted here (see
    app/services/template_service.py)."""
    payload = {
        "name": name,
        "language": language,
        "category": category,
        "components": [
            {
                "type": "BODY",
                "text": body_text,
                **({"example": {"body_text": [variable_examples]}} if variable_examples else {}),
            }
        ],
    }
    try:
        response = httpx.post(
            f"{GRAPH_API_BASE}/{waba_id}/message_templates",
            headers={"Authorization": f"Bearer {access_token}"},
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        message = _meta_error_message(e.response)
        logger.error(f"Failed to create template {name} for WABA {waba_id}: {message}")
        raise AppError(400, f"Meta rejected this template: {message}")
    except httpx.HTTPError as e:
        logger.error(f"Failed to create template {name} for WABA {waba_id}: {e}")
        raise AppError(400, "Couldn't reach Meta to submit this template — try again.")


def verify_signature(payload_body: bytes, signature_header: str | None) -> bool:
    """Confirm a webhook POST actually came from Meta, via the app secret's
    HMAC-SHA256 over the raw body. Skips the check (with a warning) if no
    app secret is configured yet, so the webhook still works before that's
    set up in the Meta dashboard."""
    if not settings.whatsapp_app_secret:
        # Fail closed in production — an unset secret must never mean
        # "accept every webhook", or anyone could forge inbound messages
        # and orders. Only skip the check in local dev.
        if settings.is_production:
            logger.error("WHATSAPP_APP_SECRET not configured in production — rejecting webhook")
            return False
        logger.warning("WHATSAPP_APP_SECRET not configured — skipping webhook signature verification (dev only)")
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(settings.whatsapp_app_secret.encode(), payload_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))


def _meta_error_message(response: httpx.Response) -> str:
    """Meta's Graph API errors come back as {"error": {"message": "..."}}
    — surface that instead of a generic string, it's usually specific
    enough (wrong permission, token expired, app not linked) to actually
    tell the business owner what to fix."""
    try:
        return response.json()["error"]["message"]
    except Exception:
        return response.text[:200]


def _graph_get(path: str, params: dict) -> dict:
    try:
        response = httpx.get(f"{GRAPH_API_BASE}/{path}", params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Graph API call to {path} failed: {e}")
        raise AppError(400, "Meta rejected that request — the code may have expired, try connecting again.")


def exchange_code_for_token(code: str) -> str:
    """Embedded Signup hands the frontend a short-lived authorization
    code, never a token — this is the server-side exchange for a
    short-lived user access token."""
    if not settings.whatsapp_app_id or not settings.whatsapp_app_secret:
        raise AppError(500, "WhatsApp integration isn't fully configured on the server yet")

    data = _graph_get(
        "oauth/access_token",
        {
            "client_id": settings.whatsapp_app_id,
            "client_secret": settings.whatsapp_app_secret,
            "code": code,
        },
    )
    return data["access_token"]


def exchange_for_long_lived_token(short_lived_token: str) -> str:
    """Short-lived tokens expire in about an hour — swap for one that
    lasts ~60 days before storing it. (Full non-expiring System User
    tokens need a Business Manager step beyond Embedded Signup itself;
    60-day tokens are the right default for now.)"""
    data = _graph_get(
        "oauth/access_token",
        {
            "grant_type": "fb_exchange_token",
            "client_id": settings.whatsapp_app_id,
            "client_secret": settings.whatsapp_app_secret,
            "fb_exchange_token": short_lived_token,
        },
    )
    return data["access_token"]


def get_phone_number_details(phone_number_id: str, access_token: str) -> dict:
    """Fetch the human-readable number for a phone_number_id — this is
    what the webhook later matches inbound messages against, Meta's
    Embedded Signup postMessage event doesn't include it directly."""
    try:
        response = httpx.get(
            f"{GRAPH_API_BASE}/{phone_number_id}",
            params={"fields": "display_phone_number", "access_token": access_token},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        message = _meta_error_message(e.response)
        logger.error(f"Failed to fetch phone number details for {phone_number_id}: {message}")
        raise AppError(400, f"Couldn't verify that phone number with Meta: {message}")
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch phone number details for {phone_number_id}: {e}")
        raise AppError(400, "Couldn't verify that phone number with Meta.")


def subscribe_app_to_waba(waba_id: str, access_token: str) -> None:
    """Tells Meta to start sending this WhatsApp Business Account's
    events to Exofe's webhook — without this, a connected number never
    actually delivers messages to us."""
    try:
        response = httpx.post(
            f"{GRAPH_API_BASE}/{waba_id}/subscribed_apps",
            params={"access_token": access_token},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        message = _meta_error_message(e.response)
        logger.error(f"Failed to subscribe app to WABA {waba_id}: {message}")
        raise AppError(400, f"Meta rejected the webhook subscription: {message}")
    except httpx.HTTPError as e:
        logger.error(f"Failed to subscribe app to WABA {waba_id}: {e}")
        raise AppError(400, "Connected, but Meta didn't confirm the webhook subscription — try reconnecting.")
