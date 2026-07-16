# app/api/v1/customers.py
# Endpoints: GET /customers, GET /customers/{id}, GET/POST /customers/{id}/notes

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.customer import (
    CreateCustomerNoteRequest,
    CreateCustomerNoteResponse,
    CustomerDetail,
    CustomerDetailResponse,
    CustomerNote,
    CustomerNotesResponse,
    CustomerOrderSummary,
    CustomerSummary,
    CustomersListResponse,
)
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["customers"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("", response_model=CustomersListResponse)
def list_customers(
    db: DbSession,
    current: CurrentOwner,
    search: str | None = Query(default=None),
) -> CustomersListResponse:
    business_id = _require_business(current)
    rows = customer_service.list_customers(db, business_id, search=search)
    return CustomersListResponse(
        customers=[
            CustomerSummary(
                id=str(r["id"]),
                name=r["name"],
                whatsapp_number=r["whatsapp_number"],
                total_spent=float(r["total_spent"]),
                created_at=r["created_at"].isoformat(),
            )
            for r in rows
        ]
    )


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(customer_id: str, db: DbSession, current: CurrentOwner) -> CustomerDetailResponse:
    business_id = _require_business(current)
    data = customer_service.get_customer_detail(db, business_id, customer_id)

    return CustomerDetailResponse(
        customer=CustomerDetail(
            id=str(data["id"]),
            name=data["name"],
            whatsapp_number=data["whatsapp_number"],
            total_spent=float(data["total_spent"]),
            created_at=data["created_at"].isoformat(),
            orders=[
                CustomerOrderSummary(
                    id=str(o["id"]),
                    status=o["status"],
                    payment_method=o["payment_method"],
                    total=float(o["total"]),
                    created_at=o["created_at"].isoformat(),
                )
                for o in data["orders"]
            ],
        )
    )


@router.get("/{customer_id}/notes", response_model=CustomerNotesResponse)
def list_notes(customer_id: str, db: DbSession, current: CurrentOwner) -> CustomerNotesResponse:
    business_id = _require_business(current)
    rows = customer_service.list_notes(db, business_id, customer_id)
    return CustomerNotesResponse(
        notes=[
            CustomerNote(
                id=str(n["id"]),
                note=n["note"],
                author_name=f"{n['author_first_name']} {n['author_last_name']}",
                created_at=n["created_at"].isoformat(),
            )
            for n in rows
        ]
    )


@router.post("/{customer_id}/notes", response_model=CreateCustomerNoteResponse, status_code=status.HTTP_201_CREATED)
def add_note(
    customer_id: str, body: CreateCustomerNoteRequest, db: DbSession, current: CurrentOwner
) -> CreateCustomerNoteResponse:
    business_id = _require_business(current)
    created = customer_service.add_note(
        db, business_id, customer_id, author_id=current.user_id, note=body.note
    )
    return CreateCustomerNoteResponse(
        note=CustomerNote(
            id=str(created["id"]),
            note=created["note"],
            author_name=created["author_name"],
            created_at=created["created_at"].isoformat(),
        )
    )