# app/api/v1/notifications.py
# Powers the dashboard Topbar's bell dropdown.
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.notifications import NotificationRow, NotificationsResponse
from app.repositories import notification_repository

router = APIRouter(prefix="/notifications", tags=["notifications"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("", response_model=NotificationsResponse)
def list_notifications(db: DbSession, current: CurrentOwner) -> NotificationsResponse:
    business_id = _require_business(current)
    rows = notification_repository.list_notifications(db, business_id)
    unread = notification_repository.count_unread(db, business_id)
    return NotificationsResponse(
        notifications=[
            NotificationRow(
                id=str(row["id"]),
                title=row["title"],
                body=row["body"],
                is_read=row["is_read"],
                created_at=row["created_at"].isoformat(),
            )
            for row in rows
        ],
        unread_count=unread,
    )


@router.post("/mark-read", response_model=NotificationsResponse)
def mark_read(db: DbSession, current: CurrentOwner) -> NotificationsResponse:
    business_id = _require_business(current)
    notification_repository.mark_all_read(db, business_id)
    return list_notifications(db, current)
