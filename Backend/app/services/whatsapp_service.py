# app/services/whatsapp_service.py
from sqlalchemy.orm import Session

from app.ai import whatsapp_client
from app.core.exceptions import AppError
from app.repositories import user_repository


def get_status(db: Session, business_id: str) -> dict:
    business = user_repository.get_business_by_id(db, business_id)
    return {
        "connected": business["whatsapp_connected_at"] is not None,
        "whatsapp_number": business["whatsapp_number"],
        "connected_at": business["whatsapp_connected_at"].isoformat() if business["whatsapp_connected_at"] else None,
    }


def connect(
    db: Session,
    *,
    business_id: str,
    code: str | None,
    access_token: str | None,
    phone_number_id: str,
    business_account_id: str,
) -> dict:
    """Finishes a WhatsApp connection from either Embedded Signup (code)
    or manual entry (access_token already in hand): resolves a working
    token, tells Meta to route this WABA's events to our webhook, looks
    up the actual phone number, and saves it all against the business.
    """
    if code:
        short_lived = whatsapp_client.exchange_code_for_token(code)
        access_token = whatsapp_client.exchange_for_long_lived_token(short_lived)

    whatsapp_client.subscribe_app_to_waba(business_account_id, access_token)
    details = whatsapp_client.get_phone_number_details(phone_number_id, access_token)

    existing = user_repository.get_business_by_whatsapp_number(db, details["display_phone_number"])
    if existing and existing["id"] != business_id:
        raise AppError(
            400,
            "This WhatsApp number is already connected to another Exofe business account. "
            "Disconnect it there first, or use a different number.",
        )

    return user_repository.update_whatsapp_connection(
        db,
        business_id,
        whatsapp_number=details["display_phone_number"],
        phone_number_id=phone_number_id,
        waba_id=business_account_id,
        access_token=access_token,
    )


def disconnect(db: Session, business_id: str) -> dict:
    return user_repository.clear_whatsapp_connection(db, business_id)
