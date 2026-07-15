# /api/v1/settings.py
# Endpoints: GET /settings, PATCH /settings/profile, /settings/hours,
# /settings/delivery, /settings/tax, /settings/language
# (later: GET/POST/DELETE /settings/team)
#
# Business hours are intentionally NOT persisted — no business_hours table.
# /settings/hours just validates and echoes the payload back so the
# frontend section keeps working, nothing is stored server-side.

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.settings import (
    DAYS,
    BusinessHourRow,
    BusinessProfile,
    BusinessProfileWrapper,
    DeliverySettings,
    DeliveryWrapper,
    HoursUpdateRequest,
    HoursWrapper,
    LanguageUpdateRequest,
    LanguageWrapper,
    SettingsResponse,
    SettingsWrapper,
    TaxSettings,
    TaxWrapper,
)
from app.repositories import user_repository

router = APIRouter(prefix="/settings", tags=["settings"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _profile_from_business(business: dict) -> BusinessProfile:
    return BusinessProfile(
        business_name=business["name"],
        category=business["industry"] or "",
        description=business["description"] or "",
        support_email=business["support_email"] or "",
        support_phone=business["support_phone"] or "",
        logo=business["logo_url"],
    )


def _delivery_from_business(business: dict) -> DeliverySettings:
    return DeliverySettings(
        areas=business["delivery_areas"] or "",
        charge=float(business["delivery_charge"]),
        estimated_time=business["delivery_estimated_time"] or "",
        cash_on_delivery=business["cash_on_delivery"],
        pickup_available=business["pickup_available"],
    )


def _tax_from_business(business: dict) -> TaxSettings:
    return TaxSettings(
        tax_name=business["tax_name"] or "",
        tax_rate=float(business["tax_rate"]),
        prices_include_tax=business["prices_include_tax"],
    )


def _default_hours() -> list[BusinessHourRow]:
    return [BusinessHourRow(day=d) for d in DAYS]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("", response_model=SettingsWrapper)
def get_settings(db: DbSession, current: CurrentOwner) -> SettingsWrapper:
    business_id = _require_business(current)

    business = user_repository.get_business_by_id(db, business_id)
    if not business:
        raise AppError(404, "Business not found")

    return SettingsWrapper(
        settings=SettingsResponse(
            profile=_profile_from_business(business),
            hours=_default_hours(),
            delivery=_delivery_from_business(business),
            tax=_tax_from_business(business),
            language=business["language"],
        )
    )


@router.patch("/profile", response_model=BusinessProfileWrapper)
def update_profile(payload: BusinessProfile, db: DbSession, current: CurrentOwner) -> BusinessProfileWrapper:
    business_id = _require_business(current)

    # Always an update to the one business row created at signup, never a
    # new row — see update_business_fields.
    business = user_repository.update_business_fields(
        db,
        business_id,
        name=payload.business_name.strip(),
        industry=payload.category or None,
        description=payload.description,
        support_email=payload.support_email,
        support_phone=payload.support_phone,
        logo_url=payload.logo,
    )
    db.commit()

    return BusinessProfileWrapper(profile=_profile_from_business(business))


@router.patch("/hours", response_model=HoursWrapper)
def update_hours(payload: HoursUpdateRequest, db: DbSession, current: CurrentOwner) -> HoursWrapper:
    # Not persisted anywhere — just validates the shape and hands it back
    # so the frontend's save flow still works.
    _require_business(current)
    return HoursWrapper(hours=payload.hours)


@router.patch("/delivery", response_model=DeliveryWrapper)
def update_delivery(payload: DeliverySettings, db: DbSession, current: CurrentOwner) -> DeliveryWrapper:
    business_id = _require_business(current)

    business = user_repository.update_business_fields(
        db,
        business_id,
        delivery_areas=payload.areas,
        delivery_charge=payload.charge,
        delivery_estimated_time=payload.estimated_time,
        cash_on_delivery=payload.cash_on_delivery,
        pickup_available=payload.pickup_available,
    )
    db.commit()

    return DeliveryWrapper(delivery=_delivery_from_business(business))


@router.patch("/tax", response_model=TaxWrapper)
def update_tax(payload: TaxSettings, db: DbSession, current: CurrentOwner) -> TaxWrapper:
    business_id = _require_business(current)

    business = user_repository.update_business_fields(
        db,
        business_id,
        tax_name=payload.tax_name,
        tax_rate=payload.tax_rate,
        prices_include_tax=payload.prices_include_tax,
    )
    db.commit()

    return TaxWrapper(tax=_tax_from_business(business))


@router.patch("/language", response_model=LanguageWrapper)
def update_language(payload: LanguageUpdateRequest, db: DbSession, current: CurrentOwner) -> LanguageWrapper:
    business_id = _require_business(current)

    business = user_repository.update_business_fields(db, business_id, language=payload.language)
    db.commit()

    return LanguageWrapper(language=business["language"])
