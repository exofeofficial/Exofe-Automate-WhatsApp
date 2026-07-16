# app/services/automation_service.py
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories import automation_repository, user_repository


def _ensure_whatsapp_connected_if_activating(db: Session, business_id: str, status: str) -> None:
    """A template can be saved as a draft any time, but it can't go
    active until the business has a connected WhatsApp number — an
    "active" automation with nowhere to send messages is a no-op that
    would just look activated to the business owner.
    """
    if status != "active":
        return

    business = user_repository.get_business_by_id(db, business_id)
    if not business or not business["whatsapp_connected_at"]:
        raise AppError(400, "Connect your WhatsApp number before activating a template")


def list_messages(db: Session, business_id: str) -> list[dict]:
    return automation_repository.list_messages(db, business_id)


def get_message(db: Session, business_id: str, message_id: str) -> dict:
    message = automation_repository.get_message(db, business_id, message_id)
    if not message:
        raise AppError(404, "Automation not found")
    return message


def create_message(db: Session, business_id: str, data: dict) -> dict:
    _ensure_whatsapp_connected_if_activating(db, business_id, data["status"])
    return automation_repository.create_message(db, business_id, data)


def update_message(db: Session, business_id: str, message_id: str, data: dict) -> dict:
    _ensure_whatsapp_connected_if_activating(db, business_id, data["status"])
    updated = automation_repository.update_message(db, business_id, message_id, data)
    if not updated:
        raise AppError(404, "Automation not found")
    return updated


def delete_message(db: Session, business_id: str, message_id: str) -> None:
    deleted = automation_repository.delete_message(db, business_id, message_id)
    if not deleted:
        raise AppError(404, "Automation not found")