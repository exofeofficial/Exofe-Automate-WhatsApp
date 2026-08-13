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


def list_conversations(db: Session, business_id: str) -> list[dict]:
    """One row per customer who has exchanged at least one message, with
    their latest message and an unread count (inbound messages since the
    last outbound reply — there's no per-message read flag, so "unread"
    is approximated as "not yet answered")."""
    rows = db.execute(
        text("""
            SELECT
                c.id, c.name, c.whatsapp_number, c.conversation_mode AS mode,
                lm.content AS last_message, lm.created_at AS last_message_at, lm.direction AS last_direction,
                COALESCE(uc.unread_count, 0)::int AS unread_count
            FROM customers c
            JOIN LATERAL (
                SELECT content, created_at, direction
                FROM whatsapp_message_logs
                WHERE customer_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) lm ON true
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS unread_count
                FROM whatsapp_message_logs
                WHERE customer_id = c.id
                  AND direction = 'inbound'
                  AND created_at > COALESCE(
                      (SELECT MAX(created_at) FROM whatsapp_message_logs
                       WHERE customer_id = c.id AND direction = 'outbound'),
                      '-infinity'
                  )
            ) uc ON true
            WHERE c.business_id = :business_id
            ORDER BY lm.created_at DESC
        """),
        {"business_id": business_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def get_messages_for_customer(db: Session, business_id: str, customer_id: str) -> list[dict]:
    rows = db.execute(
        text("""
            SELECT id, direction, content, ai_generated, created_at
            FROM whatsapp_message_logs
            WHERE business_id = :business_id AND customer_id = :customer_id
            ORDER BY created_at ASC
        """),
        {"business_id": business_id, "customer_id": customer_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


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
