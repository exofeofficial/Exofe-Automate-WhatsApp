# repositories/message_repository.py
# Raw SQL queries for the whatsapp_message_logs table.
# This is the idempotency check point — every inbound webhook checks here first.

from sqlalchemy import text
from sqlalchemy.orm import Session


def message_exists(db: Session, whatsapp_message_id: str) -> bool:
    """Meta retries webhook deliveries on any timeout/failure, so the same
    message can arrive more than once. Checking this before processing
    is what stops a retry from creating a second order."""
    row = db.execute(
        text("SELECT 1 FROM whatsapp_message_logs WHERE whatsapp_message_id = :id"),
        {"id": whatsapp_message_id},
    ).fetchone()
    return row is not None


def log_message(
    db: Session,
    *,
    business_id: str,
    customer_id: str | None,
    direction: str,
    content: str,
    ai_generated: bool = False,
    whatsapp_message_id: str | None = None,
) -> dict:
    row = db.execute(
        text("""
            INSERT INTO whatsapp_message_logs
                (business_id, customer_id, direction, content, ai_generated, whatsapp_message_id)
            VALUES (:business_id, :customer_id, :direction, :content, :ai_generated, :whatsapp_message_id)
            ON CONFLICT (whatsapp_message_id) DO NOTHING
            RETURNING *
        """),
        {
            "business_id": business_id,
            "customer_id": customer_id,
            "direction": direction,
            "content": content,
            "ai_generated": ai_generated,
            "whatsapp_message_id": whatsapp_message_id,
        },
    ).fetchone()
    db.commit()
    return dict(row._mapping) if row else {}
