# app/repositories/draft_order_repository.py

import json

from sqlalchemy import text
from sqlalchemy.orm import Session


def _normalize(row) -> dict:
    d = dict(row._mapping)
    d["id"] = str(d["id"])
    return d


def get_active_draft(db: Session, business_id: str, customer_id: str) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT * FROM draft_orders
            WHERE customer_id = :customer_id AND business_id = :business_id AND status = 'collecting'
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"customer_id": customer_id, "business_id": business_id},
    ).fetchone()
    return _normalize(row) if row else None


def create_draft(
    db: Session, business_id: str, customer_id: str, data: dict, missing_fields: list[str]
) -> dict:
    row = db.execute(
        text(
            """
            INSERT INTO draft_orders (business_id, customer_id, data, missing_fields)
            VALUES (:business_id, :customer_id, :data::jsonb, :missing_fields)
            RETURNING *
            """
        ),
        {
            "business_id": business_id,
            "customer_id": customer_id,
            "data": json.dumps(data),
            "missing_fields": missing_fields,
        },
    ).fetchone()
    db.commit()
    return _normalize(row)


def update_draft(db: Session, business_id: str, draft_id: str, data: dict, missing_fields: list[str]) -> dict | None:
    row = db.execute(
        text(
            """
            UPDATE draft_orders
            SET data = :data::jsonb, missing_fields = :missing_fields, updated_at = NOW()
            WHERE id = :draft_id AND business_id = :business_id
            RETURNING *
            """
        ),
        {
            "draft_id": draft_id,
            "business_id": business_id,
            "data": json.dumps(data),
            "missing_fields": missing_fields,
        },
    ).fetchone()
    db.commit()
    return _normalize(row) if row else None


def mark_status(
    db: Session, business_id: str, draft_id: str, status: str, order_id: str | None = None
) -> dict | None:
    row = db.execute(
        text(
            """
            UPDATE draft_orders
            SET status = :status, order_id = :order_id, updated_at = NOW()
            WHERE id = :draft_id AND business_id = :business_id
            RETURNING *
            """
        ),
        {"draft_id": draft_id, "business_id": business_id, "status": status, "order_id": order_id},
    ).fetchone()
    db.commit()
    return _normalize(row) if row else None


def clear_active(db: Session, business_id: str, customer_id: str) -> None:
    db.execute(
        text(
            "DELETE FROM draft_orders WHERE customer_id = :customer_id "
            "AND business_id = :business_id AND status = 'collecting'"
        ),
        {"customer_id": customer_id, "business_id": business_id},
    )
    db.commit()


def get_draft_by_id(db: Session, business_id: str, draft_id: str) -> dict | None:
    row = db.execute(
        text("SELECT * FROM draft_orders WHERE id = :draft_id AND business_id = :business_id"),
        {"draft_id": draft_id, "business_id": business_id},
    ).fetchone()
    return _normalize(row) if row else None