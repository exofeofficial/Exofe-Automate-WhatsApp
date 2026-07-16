# app/repositories/ai_usage_repository.py
from sqlalchemy import text
from sqlalchemy.orm import Session

_COLUMNS = "business_id, window_count, window_started_at, blocked_at, month_count, month_started_at"


def get_usage(db: Session, business_id: str) -> dict | None:
    row = db.execute(
        text(f"SELECT {_COLUMNS} FROM ai_usage WHERE business_id = :business_id"),
        {"business_id": business_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def create_usage(db: Session, business_id: str) -> dict:
    row = db.execute(
        text(
            f"""
            INSERT INTO ai_usage (business_id)
            VALUES (:business_id)
            ON CONFLICT (business_id) DO UPDATE SET business_id = EXCLUDED.business_id
            RETURNING {_COLUMNS}
            """
        ),
        {"business_id": business_id},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def save_usage(
    db: Session,
    business_id: str,
    *,
    window_count: int,
    window_started_at,
    blocked_at,
    month_count: int,
    month_started_at,
) -> dict:
    row = db.execute(
        text(
            f"""
            UPDATE ai_usage SET
                window_count = :window_count,
                window_started_at = :window_started_at,
                blocked_at = :blocked_at,
                month_count = :month_count,
                month_started_at = :month_started_at
            WHERE business_id = :business_id
            RETURNING {_COLUMNS}
            """
        ),
        {
            "business_id": business_id,
            "window_count": window_count,
            "window_started_at": window_started_at,
            "blocked_at": blocked_at,
            "month_count": month_count,
            "month_started_at": month_started_at,
        },
    ).fetchone()
    db.commit()
    return dict(row._mapping)
