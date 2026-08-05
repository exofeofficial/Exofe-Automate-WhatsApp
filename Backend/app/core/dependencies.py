"""
FastAPI dependencies for authentication.

get_current_user  – decodes the JWT from the Authorization header and returns
                    a CurrentUser dataclass.  Use as a dependency on any route
                    that requires a logged-in user.
"""

from dataclasses import dataclass
from typing import Annotated

from jose import JWTError, ExpiredSignatureError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database.session import get_db
from app.repositories import user_repository

_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class CurrentUser:
    """Immutable identity object injected into protected routes."""

    user_id: str
    business_id: str | None
    role: str  # "admin" | "owner" | "staff"


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
    ],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    """Decode the Bearer token and return a ``CurrentUser``.

    Raises 401 if the token is missing, expired, or structurally invalid.
    Raises 403 if the token's business has been suspended by an admin —
    checked on every request (not just at login) since tokens are valid
    for 7 days and a suspension must take effect immediately.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Re-validate against the DB on every request instead of trusting the
    # token's claims. Tokens live 7 days, so a member who's been removed
    # or demoted must not keep access (or their old role) until expiry —
    # and role/business_id are read from the row, never from the token, so
    # a tampered claim can't grant privileges even if the secret leaked.
    user = user_repository.get_user_by_id(db, payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user["status"] == "invited":
        # Invited-but-not-accepted rows have no password and shouldn't be
        # usable as an identity even if a token somehow references them.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    business_id = str(user["business_id"]) if user["business_id"] else None
    if business_id:
        business = user_repository.get_business_by_id(db, business_id)
        if business and business["status"] == "suspended":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been suspended",
            )

    return CurrentUser(
        user_id=str(user["id"]),
        business_id=business_id,
        role=user["role"],
    )
