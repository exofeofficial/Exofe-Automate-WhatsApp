# app/repositories/notification_repository.py
# Plain SQL for the notifications table — powers the dashboard Topbar's
# bell dropdown.

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_notification(db: Session, *, business_id: str, title: str, body: str) -> dict:
    row = db.execute(
        text(
            """
            INSERT INTO notifications (business_id, title, body)
            VALUES (:business_id, :title, :body)
            RETURNING *
            """
        ),
        {"business_id": business_id, "title": title, "body": body},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def list_notifications(db: Session, business_id: str, limit: int = 20) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT * FROM notifications
            WHERE business_id = :business_id
            ORDER BY created_at DESC
            LIMIT :limit
            """
        ),
        {"business_id": business_id, "limit": limit},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def count_unread(db: Session, business_id: str) -> int:
    return db.execute(
        text("SELECT count(*) FROM notifications WHERE business_id = :business_id AND is_read = FALSE"),
        {"business_id": business_id},
    ).scalar()


def mark_all_read(db: Session, business_id: str) -> None:
    db.execute(
        text("UPDATE notifications SET is_read = TRUE WHERE business_id = :business_id AND is_read = FALSE"),
        {"business_id": business_id},
    )
    db.commit()
