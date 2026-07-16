# app/services/order_service.py

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories import customer_repository, order_repository


def list_orders(
    db: Session, business_id: str, *, status: str | None = None, search: str | None = None
) -> tuple[list[dict], dict[str, int]]:
    rows = order_repository.list_orders(db, business_id, status=status, search=search)
    counts = order_repository.count_by_status(db, business_id)
    return rows, counts


def get_order_detail(db: Session, business_id: str, order_id: str) -> dict:
    order = order_repository.get_order(db, business_id, order_id)
    if not order:
        raise AppError(404, "Order not found")
    items = order_repository.get_order_items(db, order_id)
    return {**order, "items": items}


def update_order_status(db: Session, business_id: str, order_id: str, status: str) -> dict:
    updated = order_repository.update_order_status(db, business_id, order_id, status)
    if not updated:
        raise AppError(404, "Order not found")

    # Whatever the status changed to or from, total_spent has to reflect
    # the current set of delivered orders for this customer.
    customer_repository.recalculate_total_spent(db, str(updated["customer_id"]))

    return get_order_detail(db, business_id, order_id)