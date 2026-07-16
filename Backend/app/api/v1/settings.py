# app/api/v1/settings.py
# Endpoints: GET /settings, PATCH /settings/profile, /settings/hours,
# /settings/delivery, /settings/tax, /settings/payment, /settings/language
# (later: GET/POST/DELETE /settings/team)
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.settings import (
    BusinessProfile,
    BusinessProfileWrapper,
    DeliverySettings,
    DeliveryWrapper,
    HoursUpdateRequest,
    HoursWrapper,
    LanguageUpdateRequest,
    LanguageWrapper,
    PaymentSettings,
    PaymentWrapper,
    SettingsWrapper,
    TaxSettings,
    TaxWrapper,
)
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("", response_model=SettingsWrapper)
def get_settings(db: DbSession, current: CurrentOwner) -> SettingsWrapper:
    business_id = _require_business(current)
    return SettingsWrapper(settings=settings_service.get_settings(db, business_id))


@router.patch("/profile", response_model=BusinessProfileWrapper)
def update_profile(payload: BusinessProfile, db: DbSession, current: CurrentOwner) -> BusinessProfileWrapper:
    business_id = _require_business(current)
    return BusinessProfileWrapper(profile=settings_service.update_profile(db, business_id, payload))


@router.patch("/hours", response_model=HoursWrapper)
def update_hours(payload: HoursUpdateRequest, db: DbSession, current: CurrentOwner) -> HoursWrapper:
    _require_business(current)
    return HoursWrapper(hours=settings_service.update_hours(payload.hours))


@router.patch("/delivery", response_model=DeliveryWrapper)
def update_delivery(payload: DeliverySettings, db: DbSession, current: CurrentOwner) -> DeliveryWrapper:
    business_id = _require_business(current)
    return DeliveryWrapper(delivery=settings_service.update_delivery(db, business_id, payload))


@router.patch("/tax", response_model=TaxWrapper)
def update_tax(payload: TaxSettings, db: DbSession, current: CurrentOwner) -> TaxWrapper:
    business_id = _require_business(current)
    return TaxWrapper(tax=settings_service.update_tax(db, business_id, payload))


@router.patch("/payment", response_model=PaymentWrapper)
def update_payment(payload: PaymentSettings, db: DbSession, current: CurrentOwner) -> PaymentWrapper:
    business_id = _require_business(current)
    return PaymentWrapper(payment=settings_service.update_payment(db, business_id, payload))


@router.patch("/language", response_model=LanguageWrapper)
def update_language(payload: LanguageUpdateRequest, db: DbSession, current: CurrentOwner) -> LanguageWrapper:
    business_id = _require_business(current)
    return LanguageWrapper(language=settings_service.update_language(db, business_id, payload.language))