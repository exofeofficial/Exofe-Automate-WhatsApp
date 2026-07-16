# app/api/v1/billing.py
# Endpoints: GET /billing/trial-status, POST /billing/subscribe,
#            POST /billing/cancel, GET /billing/payments
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.billing import PaymentRow, PaymentsListResponse, SubscribeRequest, TrialStatusResponse
from app.services import billing_service

router = APIRouter(prefix="/billing", tags=["billing"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


def _require_owner(current: CurrentUser) -> str:
    business_id = _require_business(current)
    if current.role != "owner":
        raise AppError(403, "Only the account owner can manage billing")
    return business_id


@router.get("/trial-status", response_model=TrialStatusResponse)
def trial_status(db: DbSession, current: CurrentOwner) -> TrialStatusResponse:
    business_id = _require_business(current)
    return TrialStatusResponse(**billing_service.get_trial_status(db, business_id))


@router.post("/subscribe", response_model=TrialStatusResponse)
def subscribe(payload: SubscribeRequest, db: DbSession, current: CurrentOwner) -> TrialStatusResponse:
    business_id = _require_owner(current)
    return TrialStatusResponse(**billing_service.subscribe(db, business_id, payload.plan))


@router.post("/cancel", response_model=TrialStatusResponse)
def cancel(db: DbSession, current: CurrentOwner) -> TrialStatusResponse:
    business_id = _require_owner(current)
    return TrialStatusResponse(**billing_service.cancel(db, business_id))


@router.get("/payments", response_model=PaymentsListResponse)
def list_payments(db: DbSession, current: CurrentOwner) -> PaymentsListResponse:
    business_id = _require_business(current)
    rows = billing_service.list_payments(db, business_id)
    return PaymentsListResponse(
        payments=[
            PaymentRow(
                id=str(r["id"]),
                amount=float(r["amount"]),
                currency=r["currency"],
                status=r["status"],
                paid_at=r["paid_at"].isoformat() if r["paid_at"] else None,
            )
            for r in rows
        ]
    )