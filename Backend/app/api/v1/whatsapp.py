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
from app.repositories import customer_repository, message_repository, user_repository
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
                msg_type = message.get("type")
                if msg_type not in ("text", "interactive"):
                    continue  # images/audio/etc come later

                wamid = message.get("id")
                if wamid and message_repository.message_exists(db, wamid):
                    continue  # Meta retried a delivery we already handled

                if msg_type == "text":
                    incoming_text = message["text"]["body"]
                    log_text = incoming_text
                else:
                    # Button/list taps land here — the reply's `id` is what
                    # we encoded when sending it (e.g. "category:<uuid>",
                    # "next", "select:<uuid>"), the `title` is what the
                    # customer actually saw and tapped, used only for the
                    # conversation log.
                    interactive = message.get("interactive", {})
                    reply_obj = interactive.get("button_reply") or interactive.get("list_reply")
                    if not reply_obj:
                        continue
                    incoming_text = reply_obj["id"]
                    log_text = reply_obj.get("title", incoming_text)

                sender = message["from"]
                contact = next((c for c in contacts if c.get("wa_id") == sender), None)
                name = contact["profile"]["name"] if contact else None

                customer = customer_repository.get_or_create_by_whatsapp(db, business["id"], sender, name)
                message_repository.log_message(
                    db,
                    business_id=business["id"],
                    customer_id=customer["id"],
                    direction="inbound",
                    content=log_text,
                    whatsapp_message_id=wamid,
                )

                reply = handle_inbound_message(db, business["id"], customer["id"], incoming_text)
                if reply:
                    send_text_message(
                        sender,
                        reply,
                        phone_number_id=business["whatsapp_phone_number_id"],
                        access_token=business["whatsapp_access_token"],
                    )
                    message_repository.log_message(
                        db,
                        business_id=business["id"],
                        customer_id=customer["id"],
                        direction="outbound",
                        content=reply,
                        ai_generated=True,
                    )

    return {"status": "received"}
