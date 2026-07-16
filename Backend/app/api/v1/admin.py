# /api/v1/admin.py

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.core.rate_limit import limiter
from app.core.security import create_access_token, verify_password
from app.database.session import get_db
from app.models.auth import AdminLoginRequest, TokenResponse
from app.repositories import user_repository
from app.repositories import business_repository
from app.services import admin_service

from app.models.admin import (
    AdminUserRow, 
    ClientRow,
    ClientDetail,
    ClientsResponse, 
    ClientDetailResponse, 
    UpdateClientStatusRequest,
    UpdateClientStatusResponse, 
    AdminUsersResponse, 
    AdminLogsResponse,
    AdminLogRow,
    SubscriptionRow, 
    SubscriptionsResponse, 
    RevenueByPlan, 
    RecentPayment, 
    RevenueResponse, 
    FeatureFlagRow, 
    FeatureFlagsResponse, 
    SetFeatureFlagRequest, 
    FeatureFlagResponse
)
router = APIRouter(prefix="/admin")

def require_admin(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    """Same as get_current_user, but 403s anyone who isn't Exofe staff."""
    if user.role != "admin":
        raise AppError(403, "Admin access required")
    return user

@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/hour")
def admin_login(
    request: Request,
    payload: AdminLoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    user = user_repository.get_user_by_email(db, payload.email)

    invalid = AppError(401, "Invalid email or password")

    if not user or user["role"] != "admin":
        raise invalid
    if not verify_password(payload.password, user["password_hash"]):
        raise invalid

    token = create_access_token(str(user["id"]), None, "admin")
    return TokenResponse(token=token)


# ── GET /admin/users ─────────────────────────────────────────────────────────
@router.get("/users", response_model=AdminUsersResponse)
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> AdminUsersResponse:
    rows = user_repository.list_users(db)
    return AdminUsersResponse(
        users=[
            AdminUserRow(
                id=str(row["id"]),
                first_name=row["first_name"],
                last_name=row["last_name"],
                email=row["email"],
                role=row["role"],
                phone=row["phone"],
                country_code=row["country_code"],
                business_name=row["business_name"],
                email_verified=row["email_verified_at"] is not None,
                created_at=row["created_at"].isoformat(),
            )
            for row in rows
        ]
    )

# ── GET /admin/clients ───────────────────────────────────────────────────────
@router.get("/clients", response_model=ClientsResponse)
def list_clients(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> ClientsResponse:
    rows = admin_service.list_clients(db)
    return ClientsResponse(
        clients=[
            ClientRow(
                id=str(row["id"]),
                name=row["name"],
                industry=row["industry"],
                status=row["status"],
                whatsapp_connected=row["whatsapp_connected_at"] is not None,
                owner_name=f"{row['owner_first_name']} {row['owner_last_name']}",
                owner_email=row["owner_email"],
                plan=row["plan"],
                subscription_status=row["subscription_status"],
                created_at=row["created_at"].isoformat(),
            )
            for row in rows
        ]
    )

# ── GET /admin/clients/{id} ──────────────────────────────────────────────────
@router.get("/clients/{business_id}", response_model=ClientDetailResponse)
def get_client(
    business_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> ClientDetailResponse:
    row = admin_service.get_client(db, business_id)   # raises AppError(404) itself now
 
    return ClientDetailResponse(
        client=ClientDetail(
            id=str(row["id"]),
            name=row["name"],
            industry=row["industry"],
            status=row["status"],
            description=row["description"],
            support_email=row["support_email"],
            support_phone=row["support_phone"],
            whatsapp_number=row["whatsapp_number"],
            whatsapp_connected=row["whatsapp_connected_at"] is not None,
            owner_name=f"{row['owner_first_name']} {row['owner_last_name']}",
            owner_email=row["owner_email"],
            owner_phone=row["owner_phone"],
            staff_count=row["staff_count"],
            plan=row["plan"],
            subscription_status=row["subscription_status"],
            subscription_amount=float(row["subscription_amount"]) if row["subscription_amount"] is not None else None,
            current_period_end=row["current_period_end"].isoformat() if row["current_period_end"] else None,
            created_at=row["created_at"].isoformat(),
        )
    )

# ── PATCH /admin/clients/{id}/status ─────────────────────────────────────────
@router.patch("/clients/{business_id}/status", response_model=UpdateClientStatusResponse)
def update_client_status(
    business_id: str,
    body: UpdateClientStatusRequest,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_admin)],
) -> UpdateClientStatusResponse:
    updated = admin_service.update_client_status(
        db, admin_id=admin.user_id, business_id=business_id, status=body.status
    )
    return UpdateClientStatusResponse(id=str(updated["id"]), name=updated["name"], status=updated["status"])


# ── GET /admin/subscriptions ─────────────────────────────────────────────────
@router.get("/subscriptions", response_model=SubscriptionsResponse)
def list_subscriptions(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> SubscriptionsResponse:
    rows = admin_service.list_subscriptions(db)
    return SubscriptionsResponse(
        subscriptions=[
            SubscriptionRow(
                id=str(row["id"]),
                business_id=str(row["business_id"]),
                business_name=row["business_name"],
                plan=row["plan"],
                status=row["status"],
                amount=float(row["amount"]),
                current_period_end=row["current_period_end"].isoformat(),
            )
            for row in rows
        ]
    )

# ── GET /admin/revenue ───────────────────────────────────────────────────────
@router.get("/revenue", response_model=RevenueResponse)
def get_revenue(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> RevenueResponse:
    summary = admin_service.get_revenue_summary(db)
    return RevenueResponse(
        total_revenue=float(summary["total_revenue"]),
        mrr=float(summary["mrr"]),
        by_plan=[
            RevenueByPlan(plan=row["plan"], business_count=row["business_count"], mrr=float(row["mrr"]))
            for row in summary["by_plan"]
        ],
        recent_payments=[
            RecentPayment(
                id=str(row["id"]),
                amount=float(row["amount"]),
                currency=row["currency"],
                status=row["status"],
                paid_at=row["paid_at"].isoformat() if row["paid_at"] else None,
                business_name=row["business_name"],
            )
            for row in summary["recent_payments"]
        ],
    )

# ── GET /admin/logs ──────────────────────────────────────────────────────────
@router.get("/logs", response_model=AdminLogsResponse)
def list_logs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> AdminLogsResponse:
    rows = admin_service.list_admin_logs(db)
    return AdminLogsResponse(
        logs=[
            AdminLogRow(
                id=str(row["id"]),
                action=row["action"],
                admin_name=f"{row['admin_first_name']} {row['admin_last_name']}",
                target_business_id=str(row["target_business_id"]) if row["target_business_id"] else None,
                target_business_name=row["target_business_name"],
                created_at=row["created_at"].isoformat(),
            )
            for row in rows
        ]
    )

# ── GET /admin/feature-flags ─────────────────────────────────────────────────
@router.get("/feature-flags", response_model=FeatureFlagsResponse)
def list_feature_flags(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> FeatureFlagsResponse:
    rows = admin_service.list_feature_flags(db)
    return FeatureFlagsResponse(
        flags=[
            FeatureFlagRow(
                id=str(row["id"]),
                key=row["key"],
                enabled=row["enabled"],
                business_id=str(row["business_id"]) if row["business_id"] else None,
                business_name=row["business_name"],
            )
            for row in rows
        ]
    )

# ── PATCH /admin/feature-flags/{key} ─────────────────────────────────────────
# businessId omitted or null = toggle the global flag for this key.
# businessId set = toggle (or create) a per-business override.

@router.patch("/feature-flags/{key}", response_model=FeatureFlagResponse)
def set_feature_flag(
    key: str,
    body: SetFeatureFlagRequest,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_admin)],
) -> FeatureFlagResponse:
    row = admin_service.set_feature_flag(
        db, admin_id=admin.user_id, key=key, enabled=body.enabled, business_id=body.business_id
    )
    return FeatureFlagResponse(
        flag=FeatureFlagRow(
            id=str(row["id"]),
            key=row["key"],
            enabled=row["enabled"],
            business_id=str(row["business_id"]) if row["business_id"] else None,
            business_name=row["business_name"],
        )
    )