# models/order.py
# Pydantic request/response schemas for orders endpoints.

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


ORDER_STATUSES = ("new", "confirmed", "shipped", "delivered", "canceled")


class OrderItem(_CamelModel):
    id: str
    product_name: str
    quantity: int
    unit_price: float


class OrderSummary(_CamelModel):
    id: str
    customer_name: str | None
    customer_phone: str
    status: str
    payment_method: str
    total: float
    item_count: int
    created_at: str


class OrderDetail(_CamelModel):
    id: str
    customer_name: str | None
    customer_phone: str
    status: str
    payment_method: str
    subtotal: float
    delivery_charge: float
    tax: float
    total: float
    delivery_address: str | None
    items: list[OrderItem]
    created_at: str


class OrdersListResponse(BaseModel):
    orders: list[OrderSummary]
    counts: dict[str, int]


class OrderDetailWrapper(BaseModel):
    order: OrderDetail


class UpdateOrderStatusRequest(_CamelModel):
    status: str = Field(..., pattern=r"^(new|confirmed|shipped|delivered|canceled)$")
