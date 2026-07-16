# app/services/settings_service.py
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.settings import (
    DAYS,
    BusinessHourRow,
    BusinessProfile,
    DeliverySettings,
    PaymentSettings,
    SettingsResponse,
    TaxSettings,
)
from app.repositories import user_repository


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


def _payment_from_business(business: dict) -> PaymentSettings:
    return PaymentSettings(online_payment_details=business["payment_details"] or "")


def _default_hours() -> list[BusinessHourRow]:
    return [BusinessHourRow(day=d) for d in DAYS]


def _get_business(db: Session, business_id: str) -> dict:
    business = user_repository.get_business_by_id(db, business_id)
    if not business:
        raise AppError(404, "Business not found")
    return business


def get_settings(db: Session, business_id: str) -> SettingsResponse:
    business = _get_business(db, business_id)
    return SettingsResponse(
        profile=_profile_from_business(business),
        hours=_default_hours(),
        delivery=_delivery_from_business(business),
        tax=_tax_from_business(business),
        payment=_payment_from_business(business),
        language=business["language"],
    )


def update_profile(db: Session, business_id: str, payload: BusinessProfile) -> BusinessProfile:
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
    return _profile_from_business(business)


def update_hours(hours: list[BusinessHourRow]) -> list[BusinessHourRow]:
    # Not persisted anywhere — no business_hours table (removed on
    # purpose, per the recent commit). Just hands the validated payload
    # back so the frontend's save flow keeps working.
    return hours


def update_delivery(db: Session, business_id: str, payload: DeliverySettings) -> DeliverySettings:
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
    return _delivery_from_business(business)


def update_tax(db: Session, business_id: str, payload: TaxSettings) -> TaxSettings:
    business = user_repository.update_business_fields(
        db,
        business_id,
        tax_name=payload.tax_name,
        tax_rate=payload.tax_rate,
        prices_include_tax=payload.prices_include_tax,
    )
    db.commit()
    return _tax_from_business(business)


def update_payment(db: Session, business_id: str, payload: PaymentSettings) -> PaymentSettings:
    business = user_repository.update_business_fields(
        db, business_id, payment_details=payload.online_payment_details
    )
    db.commit()
    return _payment_from_business(business)


def update_language(db: Session, business_id: str, language: str) -> str:
    business = user_repository.update_business_fields(db, business_id, language=language)
    db.commit()
    return business["language"]