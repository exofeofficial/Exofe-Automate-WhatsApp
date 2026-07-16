# app/api/v1/orders.py
# Endpoints: GET /orders, GET /orders/{id}, PATCH /orders/{id}/status
#
# Was calling order_repository directly before — now goes through
# order_service, same as every other module. The _order_detail() helper
# that used to live here moved into order_service.get_order_detail().

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.order import (
    OrderDetail,
    OrderDetailWrapper,
    OrderItem,
    OrdersListResponse,
    OrderSummary,
    UpdateOrderStatusRequest,
)
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


def _to_order_detail(order: dict) -> OrderDetail:
    return OrderDetail(
        id=str(order["id"]),
        customer_name=order["customer_name"],
        customer_phone=order["customer_phone"],
        status=order["status"],
        payment_method=order["payment_method"],
        subtotal=float(order["subtotal"]),
        delivery_charge=float(order["delivery_charge"]),
        tax=float(order["tax"]),
        total=float(order["total"]),
        delivery_address=order["delivery_address"],
        items=[
            OrderItem(
                id=str(i["id"]),
                product_name=i["product_name"],
                quantity=i["quantity"],
                unit_price=float(i["unit_price"]),
            )
            for i in order["items"]
        ],
        created_at=order["created_at"].isoformat(),
    )


@router.get("", response_model=OrdersListResponse)
def list_orders(
    db: DbSession,
    current: CurrentOwner,
    status: str | None = Query(None),
    search: str | None = Query(None),
) -> OrdersListResponse:
    business_id = _require_business(current)
    rows, counts = order_service.list_orders(db, business_id, status=status, search=search)

    return OrdersListResponse(
        orders=[
            OrderSummary(
                id=str(r["id"]),
                customer_name=r["customer_name"],
                customer_phone=r["customer_phone"],
                status=r["status"],
                payment_method=r["payment_method"],
                total=float(r["total"]),
                item_count=r["item_count"],
                created_at=r["created_at"].isoformat(),
            )
            for r in rows
        ],
        counts=counts,
    )


@router.get("/{order_id}", response_model=OrderDetailWrapper)
def get_order(order_id: str, db: DbSession, current: CurrentOwner) -> OrderDetailWrapper:
    business_id = _require_business(current)
    order = order_service.get_order_detail(db, business_id, order_id)
    return OrderDetailWrapper(order=_to_order_detail(order))


@router.patch("/{order_id}/status", response_model=OrderDetailWrapper)
def update_status(
    order_id: str, payload: UpdateOrderStatusRequest, db: DbSession, current: CurrentOwner
) -> OrderDetailWrapper:
    business_id = _require_business(current)
    order = order_service.update_order_status(db, business_id, order_id, payload.status)
    return OrderDetailWrapper(order=_to_order_detail(order))