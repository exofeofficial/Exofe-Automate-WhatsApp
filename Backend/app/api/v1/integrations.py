# app/api/v1/integrations.py
# Business-facing WhatsApp connection endpoints — the webhook Meta calls
# lives separately at /whatsapp/webhook (app/api/v1/whatsapp.py), this is
# what the dashboard's Connect WhatsApp wizard talks to.
# Endpoints: GET /integrations/whatsapp/status, POST /integrations/whatsapp/connect,
#            POST /integrations/whatsapp/disconnect
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.whatsapp import ConnectWhatsAppRequest, WhatsAppStatusResponse
from app.services import whatsapp_service

router = APIRouter(prefix="/integrations/whatsapp", tags=["whatsapp-integration"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("/status", response_model=WhatsAppStatusResponse)
def get_status(db: DbSession, current: CurrentOwner) -> WhatsAppStatusResponse:
    business_id = _require_business(current)
    return WhatsAppStatusResponse(**whatsapp_service.get_status(db, business_id))


@router.post("/connect", response_model=WhatsAppStatusResponse)
def connect(payload: ConnectWhatsAppRequest, db: DbSession, current: CurrentOwner) -> WhatsAppStatusResponse:
    business_id = _require_business(current)
    business = whatsapp_service.connect(
        db,
        business_id=business_id,
        code=payload.code,
        access_token=payload.access_token,
        phone_number_id=payload.phone_number_id,
        business_account_id=payload.business_account_id,
    )
    return WhatsAppStatusResponse(
        connected=True,
        whatsapp_number=business["whatsapp_number"],
        connected_at=business["whatsapp_connected_at"].isoformat(),
    )


@router.post("/disconnect", response_model=WhatsAppStatusResponse)
def disconnect(db: DbSession, current: CurrentOwner) -> WhatsAppStatusResponse:
    business_id = _require_business(current)
    whatsapp_service.disconnect(db, business_id)
    return WhatsAppStatusResponse(connected=False, whatsapp_number=None, connected_at=None)
