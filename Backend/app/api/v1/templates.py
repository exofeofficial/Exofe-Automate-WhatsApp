# app/api/v1/templates.py
# Business-facing endpoints for the "Notifications" (WhatsApp message
# templates) dashboard page — activating a starter template submits it
# to Meta under the business's own connected WABA. Approval status is
# synced back later via the message_template_status_update webhook
# (see app/api/v1/whatsapp.py).
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.templates import ActivateTemplateResponse, StarterTemplateRow, StarterTemplatesResponse
from app.services import template_service

router = APIRouter(prefix="/templates", tags=["templates"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("/starters", response_model=StarterTemplatesResponse)
def list_starters(db: DbSession, current: CurrentOwner) -> StarterTemplatesResponse:
    business_id = _require_business(current)
    rows = template_service.list_starter_templates(db, business_id)
    return StarterTemplatesResponse(templates=[StarterTemplateRow(**row) for row in rows])


@router.post("/{key}/activate", response_model=ActivateTemplateResponse)
def activate(key: str, db: DbSession, current: CurrentOwner) -> ActivateTemplateResponse:
    business_id = _require_business(current)
    row = template_service.activate_template(db, business_id, key)
    return ActivateTemplateResponse(key=row["key"], status=row["status"])
