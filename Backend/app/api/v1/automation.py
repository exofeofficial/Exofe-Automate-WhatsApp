# app/api/v1/automation.py
# Endpoints: GET/POST /automation/interactive-messages,
#            GET/PATCH/DELETE /automation/interactive-messages/{id}

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.automation import (
    InteractiveMessage,
    InteractiveMessageInput,
    InteractiveMessageResponse,
    InteractiveMessagesResponse,
    MessageResponse,
)
from app.services import automation_service

router = APIRouter(prefix="/automation", tags=["automation"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("/interactive-messages", response_model=InteractiveMessagesResponse)
def list_messages(db: DbSession, current: CurrentOwner) -> InteractiveMessagesResponse:
    business_id = _require_business(current)
    rows = automation_service.list_messages(db, business_id)
    return InteractiveMessagesResponse(messages=[InteractiveMessage(**r) for r in rows])


@router.get("/interactive-messages/{message_id}", response_model=InteractiveMessageResponse)
def get_message(message_id: str, db: DbSession, current: CurrentOwner) -> InteractiveMessageResponse:
    business_id = _require_business(current)
    row = automation_service.get_message(db, business_id, message_id)
    return InteractiveMessageResponse(message=InteractiveMessage(**row))


@router.post(
    "/interactive-messages", response_model=InteractiveMessageResponse, status_code=status.HTTP_201_CREATED
)
def create_message(
    body: InteractiveMessageInput, db: DbSession, current: CurrentOwner
) -> InteractiveMessageResponse:
    business_id = _require_business(current)
    row = automation_service.create_message(db, business_id, body.model_dump())
    return InteractiveMessageResponse(message=InteractiveMessage(**row))


@router.patch("/interactive-messages/{message_id}", response_model=InteractiveMessageResponse)
def update_message(
    message_id: str, body: InteractiveMessageInput, db: DbSession, current: CurrentOwner
) -> InteractiveMessageResponse:
    business_id = _require_business(current)
    row = automation_service.update_message(db, business_id, message_id, body.model_dump())
    return InteractiveMessageResponse(message=InteractiveMessage(**row))

@router.delete("/interactive-messages/{message_id}", response_model=MessageResponse)
def delete_message(message_id: str, db: DbSession, current: CurrentOwner) -> MessageResponse:
    business_id = _require_business(current)
    automation_service.delete_message(db, business_id, message_id)
    return MessageResponse(message="Automation deleted")