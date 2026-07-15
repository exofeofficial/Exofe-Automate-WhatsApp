# /api/v1/admin.py
# Exofe team only, not for business owners. Endpoints:
#   POST /admin/auth/login
#   (later: /admin/users, /admin/clients, /admin/subscriptions,
#    /admin/revenue, /admin/logs, /admin/feature-flags)
#
# There is no admin signup on purpose. Admin accounts are created by
# running app/scripts/create_admin.py directly on the server, only
# Exofe's own team should ever get one.

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.core.rate_limit import limiter
from app.core.security import create_access_token, verify_password
from app.database.session import get_db
from app.models.auth import AdminLoginRequest, TokenResponse
from app.repositories import user_repository

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

    # user["id"] comes back from Postgres as a UUID object, not a string,
    # and JWT claims have to be JSON serializable, so cast it here.
    # Admins have no business_id — they're not scoped to a tenant.
    token = create_access_token(str(user["id"]), None, "admin")
    return TokenResponse(token=token)


# ── GET /admin/users ─────────────────────────────────────────────────────────

class AdminUserRow(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    first_name: str
    last_name: str
    email: str
    role: str
    phone: str | None
    country_code: str | None
    business_name: str | None
    email_verified: bool
    created_at: str


class AdminUsersResponse(BaseModel):
    users: list[AdminUserRow]


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
