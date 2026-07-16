# app/repositories/customer_repository.py
# Raw SQL queries for the customers and customer_notes tables.

from sqlalchemy import text
from sqlalchemy.orm import Session

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
    existing customer's name is never overwritten here."""
    row = db.execute(
        text(
            """
            INSERT INTO customers (business_id, whatsapp_number, name)
            VALUES (:business_id, :whatsapp_number, :name)
            ON CONFLICT (business_id, whatsapp_number) DO UPDATE SET business_id = EXCLUDED.business_id
            RETURNING *
            """
        ),
        {"business_id": business_id, "whatsapp_number": whatsapp_number, "name": name},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def set_name_if_missing(db: Session, customer_id: str, name: str) -> None:
    """Fills in the customer's name once the AI learns it mid-conversation
    (e.g. while collecting a draft order) — only if we didn't already
    have one, same rule as get_or_create_by_whatsapp above."""
    db.execute(
        text("UPDATE customers SET name = :name WHERE id = :customer_id AND name IS NULL"),
        {"customer_id": customer_id, "name": name},
    )
    db.commit()


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