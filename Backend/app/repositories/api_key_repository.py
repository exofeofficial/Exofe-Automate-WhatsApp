# app/repositories/api_key_repository.py

from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session


def _row_to_dict(row) -> dict:
    """id/business_id come back from psycopg2 as uuid.UUID objects, not
    str — the Pydantic response models declare them as str and reject a
    raw UUID outright rather than coercing it, so every read has to
    stringify here."""
    d = dict(row._mapping)
    d["id"] = str(d["id"])
    d["business_id"] = str(d["business_id"])
    return d


def create(db: Session, *, business_id: str, name: str, key_prefix: str, key_hash: str) -> dict:
    row = db.execute(
        text(
            "INSERT INTO api_keys (business_id, name, key_prefix, key_hash) "
            "VALUES (:business_id, :name, :key_prefix, :key_hash) "
            "RETURNING id, business_id, name, key_prefix, last_used_at, revoked_at, created_at"
        ),
        {"business_id": business_id, "name": name, "key_prefix": key_prefix, "key_hash": key_hash},
    ).fetchone()
    db.commit()
    return _row_to_dict(row)


def list_by_business(db: Session, business_id: str) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT id, business_id, name, key_prefix, last_used_at, revoked_at, created_at "
            "FROM api_keys WHERE business_id = :business_id ORDER BY created_at DESC"
        ),
        {"business_id": business_id},
    ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_active_by_hash(db: Session, key_hash: str) -> dict | None:
    row = db.execute(
        text(
            "SELECT id, business_id, name, key_prefix, last_used_at, revoked_at, created_at "
            "FROM api_keys WHERE key_hash = :key_hash AND revoked_at IS NULL"
        ),
        {"key_hash": key_hash},
    ).fetchone()
    return _row_to_dict(row) if row else None


def touch_last_used(db: Session, key_id: str) -> None:
    db.execute(
        text("UPDATE api_keys SET last_used_at = :now WHERE id = :id"),
        {"id": key_id, "now": datetime.now(timezone.utc)},
    )
    db.commit()


def revoke(db: Session, key_id: str, business_id: str) -> bool:
    """Scoped to business_id so one business can't revoke another's key
    by guessing an id. Returns whether a row was actually revoked."""
    result = db.execute(
        text(
            "UPDATE api_keys SET revoked_at = NOW() "
            "WHERE id = :id AND business_id = :business_id AND revoked_at IS NULL"
        ),
        {"id": key_id, "business_id": business_id},
    )
    db.commit()
    return result.rowcount > 0
