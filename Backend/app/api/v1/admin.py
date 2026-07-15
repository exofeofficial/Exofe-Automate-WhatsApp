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
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.rate_limit import limiter
from app.core.security import create_access_token, verify_password
from app.database.session import get_db
from app.models.auth import AdminLoginRequest, TokenResponse
from app.repositories import user_repository

router = APIRouter(prefix="/admin")


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
    token = create_access_token({"sub": str(user["id"]), "role": "admin", "email": user["email"]})
    return TokenResponse(token=token)
