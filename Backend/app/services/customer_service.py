# app/services/customer_service.py

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories import customer_repository, user_repository


def _ensure_owned(db: Session, business_id: str, customer_id: str) -> dict:
    """customer_notes has no business_id of its own — every note
    read/write has to go through this first, or a valid JWT for one
    business could read/write notes on another business's customer just
    by guessing a customer_id."""
    customer = customer_repository.get_customer(db, business_id, customer_id)
    if not customer:
        raise AppError(404, "Customer not found")
    return customer


def list_customers(db: Session, business_id: str, *, search: str | None = None) -> list[dict]:
    return customer_repository.list_customers(db, business_id, search=search)


def get_customer_detail(db: Session, business_id: str, customer_id: str) -> dict:
    customer = _ensure_owned(db, business_id, customer_id)
    orders = customer_repository.get_orders_for_customer(db, business_id, customer_id)
    return {**customer, "orders": orders}


def list_notes(db: Session, business_id: str, customer_id: str) -> list[dict]:
    _ensure_owned(db, business_id, customer_id)
    return customer_repository.list_notes(db, customer_id)


def add_note(db: Session, business_id: str, customer_id: str, *, author_id: str, note: str) -> dict:
    _ensure_owned(db, business_id, customer_id)
    created = customer_repository.create_note(
        db, customer_id=customer_id, author_id=author_id, note=note
    )

    author = user_repository.get_user_by_id(db, author_id)
    author_name = f"{author['first_name']} {author['last_name']}" if author else "Unknown"

    return {**created, "author_name": author_name}