# app/repositories/customer_repository.py
# Raw SQL queries for the customers and customer_notes tables.

import json
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.orm import Session

AI_WINDOW = timedelta(hours=24)

def list_customers(db: Session, business_id: str, *, search: str | None = None) -> list[dict]:
    query = "SELECT * FROM customers WHERE business_id = :business_id"
    params: dict = {"business_id": business_id}

    if search:
        query += " AND (name ILIKE :search OR whatsapp_number ILIKE :search)"
        params["search"] = f"%{search}%"

    query += " ORDER BY created_at DESC"

    rows = db.execute(text(query), params).fetchall()
    return [dict(row._mapping) for row in rows]


def get_customer(db: Session, business_id: str, customer_id: str) -> dict | None:
    row = db.execute(
        text("SELECT * FROM customers WHERE id = :customer_id AND business_id = :business_id"),
        {"customer_id": customer_id, "business_id": business_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def get_or_create_by_whatsapp(db: Session, business_id: str, whatsapp_number: str, name: str | None = None) -> dict:
    """Called from the inbound WhatsApp pipeline — every message needs a
    customer row to hang a draft order / order history off of. name is
    only set on first contact (pulled from the WhatsApp profile); an
    existing customer's name is never overwritten here.

    Returned dict carries `is_new`: True only when this INSERT actually
    created the row (Postgres's xmax = 0 trick), False when it hit the
    ON CONFLICT path — the webhook uses this to decide whether to greet
    a business's brand-new customer before the AI's contextual reply."""
    row = db.execute(
        text(
            """
            INSERT INTO customers (business_id, whatsapp_number, name)
            VALUES (:business_id, :whatsapp_number, :name)
            ON CONFLICT (business_id, whatsapp_number) DO UPDATE SET business_id = EXCLUDED.business_id
            RETURNING *, (xmax = 0) AS is_new
            """
        ),
        {"business_id": business_id, "whatsapp_number": whatsapp_number, "name": name},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def get_browse_state(db: Session, customer_id: str) -> dict | None:
    """The in-progress catalog browsing session (which category, which
    product index) — None means this customer isn't mid-browse."""
    row = db.execute(
        text("SELECT browse_state FROM customers WHERE id = :customer_id"),
        {"customer_id": customer_id},
    ).fetchone()
    return row.browse_state if row and row.browse_state else None


def set_browse_state(db: Session, customer_id: str, state: dict) -> None:
    db.execute(
        text("UPDATE customers SET browse_state = :state WHERE id = :customer_id"),
        {"customer_id": customer_id, "state": json.dumps(state)},
    )
    db.commit()


def clear_browse_state(db: Session, customer_id: str) -> None:
    db.execute(
        text("UPDATE customers SET browse_state = NULL WHERE id = :customer_id"),
        {"customer_id": customer_id},
    )
    db.commit()


def set_name_if_missing(db: Session, customer_id: str, name: str) -> None:
    """Fills in the customer's name once the AI learns it mid-conversation
    (e.g. while collecting a draft order) — only if we didn't already
    have one, same rule as get_or_create_by_whatsapp above."""
    db.execute(
        text("UPDATE customers SET name = :name WHERE id = :customer_id AND name IS NULL"),
        {"customer_id": customer_id, "name": name},
    )
    db.commit()


def set_conversation_mode(db: Session, business_id: str, customer_id: str, mode: str) -> dict | None:
    """Flips a conversation between 'ai' (default) and 'human' — see
    conversations router's takeover/handback endpoints. handle_inbound_message
    checks this before generating an AI reply."""
    row = db.execute(
        text("""
            UPDATE customers SET conversation_mode = :mode
            WHERE id = :customer_id AND business_id = :business_id
            RETURNING id, conversation_mode AS mode
        """),
        {"mode": mode, "customer_id": customer_id, "business_id": business_id},
    ).fetchone()
    db.commit()
    return dict(row._mapping) if row else None


def is_new_conversation_window(db: Session, customer_id: str, now: datetime) -> bool:
    """True if this message opens a fresh 24h AI-billing conversation
    window for this customer, and advances their stored window start to
    `now` when it does. Mirrors how Meta's own WhatsApp Business Platform
    prices conversations: the first message opens a 24h window and bills
    one unit of the plan's AI usage; every other message from that same
    customer inside that window is free; a message after the window
    closes opens (and bills) a new one. See ai_usage_service.check_and_increment,
    the only caller — this only touches customers, never ai_usage."""
    row = db.execute(
        text("SELECT ai_window_started_at FROM customers WHERE id = :customer_id"),
        {"customer_id": customer_id},
    ).fetchone()
    started_at = row.ai_window_started_at if row else None

    if started_at is not None and now - started_at < AI_WINDOW:
        return False

    db.execute(
        text("UPDATE customers SET ai_window_started_at = :now WHERE id = :customer_id"),
        {"now": now, "customer_id": customer_id},
    )
    db.commit()
    return True


def get_orders_for_customer(db: Session, business_id: str, customer_id: str) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT id, status, payment_method, total, created_at
            FROM orders
            WHERE customer_id = :customer_id AND business_id = :business_id
            ORDER BY created_at DESC
            """
        ),
        {"customer_id": customer_id, "business_id": business_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def list_notes(db: Session, customer_id: str) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT n.id, n.note, n.created_at,
                   u.first_name AS author_first_name, u.last_name AS author_last_name
            FROM customer_notes n
            JOIN users u ON u.id = n.author_id
            WHERE n.customer_id = :customer_id
            ORDER BY n.created_at DESC
            """
        ),
        {"customer_id": customer_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def recalculate_total_spent(db: Session, customer_id: str) -> None:
    """Recomputes from scratch (sum of delivered orders) rather than
    incrementing/decrementing on each status change — status can flip
    to/from 'delivered' in any direction (the dashboard's status buttons
    allow un-delivering, un-canceling, etc.), so a running increment
    would drift. A full recompute can't drift."""
    db.execute(
        text(
            """
            UPDATE customers
            SET total_spent = (
                SELECT COALESCE(SUM(total), 0) FROM orders
                WHERE customer_id = :customer_id AND status = 'delivered'
            )
            WHERE id = :customer_id
            """
        ),
        {"customer_id": customer_id},
    )
    db.commit()


def create_note(db: Session, *, customer_id: str, author_id: str, note: str) -> dict:
    row = db.execute(
        text(
            """
            INSERT INTO customer_notes (customer_id, author_id, note)
            VALUES (:customer_id, :author_id, :note)
            RETURNING id, note, created_at
            """
        ),
        {"customer_id": customer_id, "author_id": author_id, "note": note},
    ).fetchone()
    db.commit()
    return dict(row._mapping)