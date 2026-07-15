"""
Raw SQL queries for the subscriptions table.

Every function receives a SQLAlchemy ``Session`` as its first argument —
repositories are plain Python, never FastAPI-aware.
"""

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_subscription(db: Session, business_id: str) -> dict | None:
    """The business's one subscription row (created at signup, updated in
    place once a paid plan is picked). ``None`` should only happen for
    accounts created before this table existed.
    """
    row = db.execute(
        text("""
            SELECT * FROM subscriptions
            WHERE business_id = :business_id
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"business_id": business_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def create_trial_subscription(
    db: Session, *, business_id: str, business_name: str, trial_ends_at: datetime
) -> dict:
    """Insert the free-trial row for a brand new business.

    Called once, right after signup. plan='trial', status='trialing',
    amount=0 — this same row gets updated (not replaced) once the
    business activates a real plan, see activate_subscription below.
    business_name is a denormalized copy of businesses.name so the row
    is readable on its own, without a join.
    """
    row = db.execute(
        text("""
            INSERT INTO subscriptions (business_id, business_name, plan, status, amount, current_period_end)
            VALUES (:business_id, :business_name, 'trial', 'trialing', 0, :trial_ends_at)
            RETURNING *
        """),
        {"business_id": business_id, "business_name": business_name, "trial_ends_at": trial_ends_at},
    ).fetchone()
    return dict(row._mapping)


def activate_subscription(db: Session, *, business_id: str, plan: str, amount: float) -> dict:
    """Fill in the business's existing subscription row with the plan
    they picked, its price, and a fresh 30-day billing period.

    No payment gateway is wired up yet, this just records the choice so
    the trial lock releases. Swap for a real Stripe/local-gateway flow
    later without changing this function's signature.
    """
    row = db.execute(
        text("""
            UPDATE subscriptions
            SET plan = :plan, status = 'active', amount = :amount,
                current_period_end = NOW() + INTERVAL '30 days'
            WHERE business_id = :business_id
            RETURNING *
        """),
        {"business_id": business_id, "plan": plan, "amount": amount},
    ).fetchone()
    return dict(row._mapping)
