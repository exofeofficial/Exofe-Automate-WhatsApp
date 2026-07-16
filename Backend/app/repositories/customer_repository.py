# repositories/customer_repository.py
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
