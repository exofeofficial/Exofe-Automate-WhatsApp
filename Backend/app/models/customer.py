# app/models/customer.py
# Pydantic request/response schemas for customers endpoints.

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CustomerSummary(_CamelModel):
    id: str
    name: str | None
    whatsapp_number: str
    total_spent: float
    created_at: str


class CustomerOrderSummary(_CamelModel):
    id: str
    status: str
    payment_method: str
    total: float
    created_at: str


class CustomerDetail(_CamelModel):
    id: str
    name: str | None
    whatsapp_number: str
    total_spent: float
    created_at: str
    orders: list[CustomerOrderSummary]


class CustomersListResponse(BaseModel):
    customers: list[CustomerSummary]


class CustomerDetailResponse(BaseModel):
    customer: CustomerDetail


class CustomerNote(_CamelModel):
    id: str
    note: str
    author_name: str
    created_at: str


class CustomerNotesResponse(BaseModel):
    notes: list[CustomerNote]


class CreateCustomerNoteRequest(_CamelModel):
    note: str = Field(..., min_length=1, max_length=1000)


class CreateCustomerNoteResponse(BaseModel):
    note: CustomerNote