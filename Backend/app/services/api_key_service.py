# app/services/api_key_service.py

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.security import generate_api_key
from app.repositories import api_key_repository

MAX_ACTIVE_KEYS = 10  # plenty for any real integration, keeps the list manageable


def generate_key(db: Session, business_id: str, name: str) -> tuple[dict, str]:
    active = [k for k in api_key_repository.list_by_business(db, business_id) if not k["revoked_at"]]
    if len(active) >= MAX_ACTIVE_KEYS:
        raise AppError(400, f"You can have at most {MAX_ACTIVE_KEYS} active API keys — revoke one first.")

    raw_key, key_prefix, key_hash = generate_api_key()
    key = api_key_repository.create(
        db, business_id=business_id, name=name, key_prefix=key_prefix, key_hash=key_hash
    )
    return key, raw_key


def list_keys(db: Session, business_id: str) -> list[dict]:
    return api_key_repository.list_by_business(db, business_id)


def revoke_key(db: Session, business_id: str, key_id: str) -> None:
    if not api_key_repository.revoke(db, key_id, business_id):
        raise AppError(404, "API key not found")
