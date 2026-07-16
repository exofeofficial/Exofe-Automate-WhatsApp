# app/services/billing_service.py

from datetime import datetime, timezone
import math

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories import subscription_repository

TRIAL_LENGTH_DAYS = 7

# Mirrors frontend/src/lib/plans.ts — keep the two in sync.
PLAN_PRICES = {"starter": 2499, "growth": 4999, "business": 9999}


def _to_trial_status(sub: dict) -> dict:
    """Maps a raw subscriptions row to the trial-status shape, handling
    all 4 status values explicitly. The old logic only special-cased
    'active' and treated everything else as trialing — harmless while
    only trialing/active ever existed, but wrong the moment a
    canceled/past_due row shows up (it would compute a trial countdown
    for an account that isn't trialing at all)."""

    if sub["status"] == "active":
        return {
            "is_trialing": False,
            "days_left": 0,
            "trial_length_days": TRIAL_LENGTH_DAYS,
            "is_expired": False,
            "current_plan": sub["plan"],
        }

    if sub["status"] in ("canceled", "past_due"):
        # Locked out either way — canceled by choice, or a payment
        # didn't go through. Show the plan they had so they know what
        # they're re-subscribing to, but treat access as expired.
        return {
            "is_trialing": False,
            "days_left": 0,
            "trial_length_days": TRIAL_LENGTH_DAYS,
            "is_expired": True,
            "current_plan": sub["plan"],
        }

    # status == "trialing"
    now = datetime.now(timezone.utc)
    trial_ends_at = sub["current_period_end"]
    is_expired = now >= trial_ends_at
    days_left = 0 if is_expired else math.ceil((trial_ends_at - now).total_seconds() / 86400)

    return {
        "is_trialing": not is_expired,
        "days_left": days_left,
        "trial_length_days": TRIAL_LENGTH_DAYS,
        "is_expired": is_expired,
        "current_plan": "trial",
    }


def get_trial_status(db: Session, business_id: str) -> dict:
    sub = subscription_repository.get_subscription(db, business_id)
    if not sub:
        raise AppError(404, "No subscription found for this business")
    return _to_trial_status(sub)


def subscribe(db: Session, business_id: str, plan: str) -> dict:
    amount = PLAN_PRICES[plan]
    sub = subscription_repository.activate_subscription(db, business_id=business_id, plan=plan, amount=amount)
    return _to_trial_status(sub)


def cancel(db: Session, business_id: str) -> dict:
    sub = subscription_repository.cancel_subscription(db, business_id)
    if not sub:
        raise AppError(404, "No subscription found for this business")
    return _to_trial_status(sub)


def list_payments(db: Session, business_id: str) -> list[dict]:
    return subscription_repository.list_payments(db, business_id)