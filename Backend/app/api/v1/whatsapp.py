# app/api/v1/whatsapp.py
# Meta-facing webhook only — one shared URL for every connected business.
# Endpoints: GET /whatsapp/webhook (verify), POST /whatsapp/webhook (events).
# Business-facing connect/status/disconnect live in app/api/v1/integrations.py.

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.ai.whatsapp_client import send_text_message, verify_signature
from app.config import settings
from app.core.logger import get_logger
from app.database.session import get_db
from app.repositories import customer_repository, user_repository
from app.services.conversation_service import handle_inbound_message

logger = get_logger(__name__)
router = APIRouter(prefix='/whatsapp', tags=['whatsapp'])


@router.get("/webhook")
def verify_webhook(
    mode: str | None = Query(default=None, alias="hub.mode"),
    token: str | None = Query(default=None, alias="hub.verify_token"),
    challenge: str | None = Query(default=None, alias="hub.challenge"),
):
    """Meta calls this once, when the webhook URL is first configured in
    the App Dashboard, to confirm we control this endpoint."""
    if mode == "subscribe" and token == settings.whatsapp_webhook_verify_token:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request, db: Annotated[Session, Depends(get_db)]):
    """Every inbound WhatsApp event lands here — customer messages, but also
    delivery/read receipts and other event types we don't act on yet.
    Meta expects a fast 200, so this stays synchronous for now (no queue
    wired up) but keeps the AI/DB work minimal per message."""
    body = await request.body()
    if not verify_signature(body, request.headers.get("x-hub-signature-256")):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages")
            if not messages:
                continue  # statuses, template updates, etc — nothing to do yet

            display_number = value.get("metadata", {}).get("display_phone_number", "")
            business = user_repository.get_business_by_whatsapp_number(db, display_number)
            if not business:
                logger.warning(f"WhatsApp webhook: no business connected for number {display_number}")
                continue

            contacts = value.get("contacts", [])

            for message in messages:
                if message.get("type") != "text":
                    continue  # images/audio/interactive replies come later

                sender = message["from"]
                text_body = message["text"]["body"]
                contact = next((c for c in contacts if c.get("wa_id") == sender), None)
                name = contact["profile"]["name"] if contact else None

                customer = customer_repository.get_or_create_by_whatsapp(db, business["id"], sender, name)
                reply = handle_inbound_message(db, business["id"], customer["id"], text_body)
                if reply:
                    send_text_message(
                        sender,
                        reply,
                        phone_number_id=business["whatsapp_phone_number_id"],
                        access_token=business["whatsapp_access_token"],
                    )

    return {"status": "received"}
