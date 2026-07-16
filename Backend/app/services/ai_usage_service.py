# app/services/ai_usage_service.py
#
# Enforces each plan's AI conversation limit (see the "X conversations/month"
# copy on the pricing page, src/lib/plans.ts on the frontend).
#
# Two separate counters, on purpose:
#   - window_count: what actually gates the AI. Once it hits the plan's
#     limit, the AI hands every message to a human for a 5 hour cooldown,
#     then the window fully resets to 0 and the business gets a fresh
#     allowance. This means the AI is never down for more than ~5 hours,
#     even on the Starter plan.
#   - month_count: informational only, shown on the dashboard as
#     "742 / 1,000 conversations this month" to match the plan copy.
#     Resets on the 1st of each calendar month. Never blocks anything.
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.repositories import ai_usage_repository, subscription_repository

COOLDOWN = timedelta(hours=5)

# None = unlimited. Trial gets the same allowance as Starter.
PLAN_AI_LIMITS: dict[str, int | None] = {
    "trial": 1000,
    "starter": 1000,
    "growth": 5000,
    "business": None,
}


def _get_limit(db: Session, business_id: str) -> int | None:
    subscription = subscription_repository.get_subscription(db, business_id)
    plan = subscription["plan"] if subscription else "trial"
    return PLAN_AI_LIMITS.get(plan, 1000)


def _same_month(a: datetime, b: datetime) -> bool:
    return a.year == b.year and a.month == b.month


def get_usage_summary(db: Session, business_id: str) -> dict:
    """Read-only view for the dashboard — doesn't consume any allowance."""
    usage = ai_usage_repository.get_usage(db, business_id) or ai_usage_repository.create_usage(db, business_id)
    limit = _get_limit(db, business_id)
    now = datetime.now(timezone.utc)

    month_count = usage["month_count"]
    if not _same_month(now, usage["month_started_at"]):
        month_count = 0

    blocked_until = None
    if usage["blocked_at"] and now - usage["blocked_at"] < COOLDOWN:
        blocked_until = usage["blocked_at"] + COOLDOWN

    return {
        "month_count": month_count,
        "month_limit": limit,
        "blocked": blocked_until is not None,
        "blocked_until": blocked_until,
    }


def check_and_increment(db: Session, business_id: str) -> bool:
    """Call this once per inbound customer message, right before asking
    the AI for a reply. Returns True if the AI should respond, False if
    this business is over its limit and the message should go to a human
    instead. Every call that doesn't return early updates the counters,
    so this should only be called once per message."""
    usage = ai_usage_repository.get_usage(db, business_id) or ai_usage_repository.create_usage(db, business_id)
    limit = _get_limit(db, business_id)
    now = datetime.now(timezone.utc)

    window_count = usage["window_count"]
    window_started_at = usage["window_started_at"]
    blocked_at = usage["blocked_at"]
    month_count = usage["month_count"]
    month_started_at = usage["month_started_at"]

    if not _same_month(now, month_started_at):
        month_count = 0
        month_started_at = now

    if limit is None:
        month_count += 1
        ai_usage_repository.save_usage(
            db,
            business_id,
            window_count=window_count,
            window_started_at=window_started_at,
            blocked_at=blocked_at,
            month_count=month_count,
            month_started_at=month_started_at,
        )
        return True

    if blocked_at is not None:
        if now - blocked_at >= COOLDOWN:
            blocked_at = None
            window_count = 0
            window_started_at = now
        else:
            ai_usage_repository.save_usage(
                db,
                business_id,
                window_count=window_count,
                window_started_at=window_started_at,
                blocked_at=blocked_at,
                month_count=month_count,
                month_started_at=month_started_at,
            )
            return False

    if window_count >= limit:
        ai_usage_repository.save_usage(
            db,
            business_id,
            window_count=window_count,
            window_started_at=window_started_at,
            blocked_at=now,
            month_count=month_count,
            month_started_at=month_started_at,
        )
        return False

    window_count += 1
    month_count += 1
    ai_usage_repository.save_usage(
        db,
        business_id,
        window_count=window_count,
        window_started_at=window_started_at,
        blocked_at=None,
        month_count=month_count,
        month_started_at=month_started_at,
    )
    return True
