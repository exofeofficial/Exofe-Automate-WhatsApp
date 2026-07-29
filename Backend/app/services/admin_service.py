# app/services/admin_service.py
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories import business_repository, subscription_repository


# ── Clients ──────────────────────────────────────────────────────────────────

def list_clients(db: Session) -> list[dict]:
    return business_repository.list_businesses(db)


def get_client(db: Session, business_id: str) -> dict:
    client = business_repository.get_business_by_id(db, business_id)
    if not client:
        raise AppError(404, "Business not found")
    return client


def update_client_status(db: Session, *, admin_id: str, business_id: str, status: str) -> dict:
    updated = business_repository.update_business_status(db, business_id, status)
    if not updated:
        raise AppError(404, "Business not found")

    action = "suspended business" if status == "suspended" else "reactivated business"
    business_repository.log_admin_action(
        db, admin_id=admin_id, action=action, target_business_id=business_id
    )
    return updated


# ── Subscriptions / Revenue ──────────────────────────────────────────────────

def list_subscriptions(db: Session) -> list[dict]:
    return business_repository.list_subscriptions(db)


def activate_subscription(db: Session, *, admin_id: str, business_id: str, plan: str, amount: float) -> dict:
    """Manually put a business on a paid plan — no payment gateway exists
    yet, so this is how a bank-transfer/JazzCash-style manual payment
    gets reflected until a real one is wired up."""
    row = subscription_repository.activate_subscription(db, business_id=business_id, plan=plan, amount=amount)
    business_repository.log_admin_action(
        db, admin_id=admin_id, action=f"manually activated the '{plan}' plan", target_business_id=business_id
    )
    return row


def get_revenue_summary(db: Session) -> dict:
    return business_repository.get_revenue_summary(db)


# ── Audit log ────────────────────────────────────────────────────────────────

def list_admin_logs(db: Session, limit: int = 100) -> list[dict]:
    return business_repository.list_admin_logs(db, limit)


# ── Feature flags ────────────────────────────────────────────────────────────

def list_feature_flags(db: Session) -> list[dict]:
    return business_repository.list_feature_flags(db)


def set_feature_flag(
    db: Session, *, admin_id: str, key: str, enabled: bool, business_id: str | None
) -> dict:
    row = business_repository.set_feature_flag(db, key=key, enabled=enabled, business_id=business_id)

    scope = f"for business {business_id}" if business_id else "globally"
    business_repository.log_admin_action(
        db,
        admin_id=admin_id,
        action=f"{'enabled' if enabled else 'disabled'} feature flag '{key}' {scope}",
        target_business_id=business_id,
    )

    business_name = business_repository.get_business_name(db, row["business_id"]) if row["business_id"] else None
    return {**row, "business_name": business_name}