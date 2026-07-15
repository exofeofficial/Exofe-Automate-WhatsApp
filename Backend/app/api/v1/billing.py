# /api/v1/billing.py
# Endpoints: GET /billing/trial-status, POST /billing/subscribe
# (later: POST /billing/cancel, GET /billing/payments)

import math
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.billing import SubscribeRequest, TrialStatusResponse
from app.repositories import subscription_repository

router = APIRouter(prefix="/billing", tags=["billing"])

TRIAL_LENGTH_DAYS = 7

# Mirrors frontend/src/lib/plans.ts — keep the two in sync.
PLAN_PRICES = {"starter": 2499, "growth": 4999, "business": 9999}

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


@router.get("/trial-status", response_model=TrialStatusResponse)
def trial_status(db: DbSession, current: CurrentOwner) -> TrialStatusResponse:
    if not current.business_id:
        raise AppError(400, "No business on this account")

    sub = subscription_repository.get_subscription(db, current.business_id)
    if not sub:
        raise AppError(404, "No subscription found for this business")

    if sub["status"] == "active":
        return TrialStatusResponse(
            is_trialing=False,
            days_left=0,
            trial_length_days=TRIAL_LENGTH_DAYS,
            is_expired=False,
            current_plan=sub["plan"],
        )

    now = datetime.now(timezone.utc)
    trial_ends_at = sub["current_period_end"]
    is_expired = now >= trial_ends_at
    days_left = 0 if is_expired else math.ceil((trial_ends_at - now).total_seconds() / 86400)

    return TrialStatusResponse(
        is_trialing=not is_expired,
        days_left=days_left,
        trial_length_days=TRIAL_LENGTH_DAYS,
        is_expired=is_expired,
        current_plan="trial",
    )


@router.post("/subscribe", response_model=TrialStatusResponse)
def subscribe(payload: SubscribeRequest, db: DbSession, current: CurrentOwner) -> TrialStatusResponse:
    if not current.business_id:
        raise AppError(400, "No business on this account")

    amount = PLAN_PRICES[payload.plan]
    subscription_repository.activate_subscription(
        db, business_id=current.business_id, plan=payload.plan, amount=amount
    )
    db.commit()

    return TrialStatusResponse(
        is_trialing=False,
        days_left=0,
        trial_length_days=TRIAL_LENGTH_DAYS,
        is_expired=False,
        current_plan=payload.plan,
    )
