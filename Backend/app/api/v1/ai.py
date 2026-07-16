# app/api/v1/ai.py
# Endpoints: GET/PATCH /ai/settings, GET/POST /ai/faqs, PATCH/DELETE /ai/faqs/{id}

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.ai import AISettings, AISettingsWrapper, FAQ, FAQRequest, FAQResponse, FAQsResponse, MessageResponse
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("/settings", response_model=AISettingsWrapper)
def get_settings(db: DbSession, current: CurrentOwner) -> AISettingsWrapper:
    business_id = _require_business(current)
    return AISettingsWrapper(settings=AISettings(**ai_service.get_settings(db, business_id)))


@router.patch("/settings", response_model=AISettingsWrapper)
def update_settings(body: AISettings, db: DbSession, current: CurrentOwner) -> AISettingsWrapper:
    business_id = _require_business(current)
    updated = ai_service.update_settings(
        db,
        business_id,
        business_prompt=body.business_prompt,
        tone=body.tone,
        greeting_message=body.greeting_message,
        handover_enabled=body.handover_enabled,
    )
    return AISettingsWrapper(settings=AISettings(**updated))


@router.get("/faqs", response_model=FAQsResponse)
def list_faqs(db: DbSession, current: CurrentOwner) -> FAQsResponse:
    business_id = _require_business(current)
    faqs = ai_service.list_faqs(db, business_id)
    return FAQsResponse(faqs=[FAQ(**f) for f in faqs])


@router.post("/faqs", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
def create_faq(body: FAQRequest, db: DbSession, current: CurrentOwner) -> FAQResponse:
    business_id = _require_business(current)
    faq = ai_service.create_faq(db, business_id, body.question, body.answer)
    return FAQResponse(faq=FAQ(**faq))


@router.patch("/faqs/{faq_id}", response_model=FAQResponse)
def update_faq(faq_id: str, body: FAQRequest, db: DbSession, current: CurrentOwner) -> FAQResponse:
    business_id = _require_business(current)
    faq = ai_service.update_faq(db, business_id, faq_id, body.question, body.answer)
    return FAQResponse(faq=FAQ(**faq))


@router.delete("/faqs/{faq_id}", response_model=MessageResponse)
def delete_faq(faq_id: str, db: DbSession, current: CurrentOwner) -> MessageResponse:
    business_id = _require_business(current)
    ai_service.delete_faq(db, business_id, faq_id)
    return MessageResponse(message="FAQ deleted")