"""
Authentication business logic.

Sits between the route layer (api/v1/auth.py) and the repository layer
(repositories/user_repository.py).  Routes should never touch the DB
directly — they call service functions, which call repositories.
"""

import secrets
from datetime import datetime, timedelta, timezone
import hmac

from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.core.security import create_access_token, hash_password, verify_password
from app.repositories import user_repository
from app.services import email_service


logger = get_logger(__name__)


class AuthError(Exception):
    """Raised for any auth-related business rule violation."""

    def __init__(self, message: str, status_code: int = 400, errors: dict | None = None):
        self.message = message
        self.status_code = status_code
        self.errors = errors
        super().__init__(message)

# Signup
def signup(
    db: Session,
    *,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    country_code: str,
    phone: str,
    hear_about: str,
) -> str:
    """Register a new business owner.

    Creates a ``users`` row (role=owner) and a ``businesses`` row in one
    transaction.  Returns a signed JWT.

    Raises ``AuthError`` with 422 if the email is already taken.
    """
    existing = user_repository.get_user_by_email(db, email)
    if existing:
        raise AuthError(
            message="Please fix the errors below",
            status_code=422,
            errors={"email": "This email is already registered"},
        )

    # 1. Create the user (business_id is NULL for now — circular dep)
    user = user_repository.create_user(
        db,
        role="owner",
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=hash_password(password),
        phone=phone,
        country_code=country_code,
    )

    # 2. Create the business, referencing the new user as the owner
    business = user_repository.create_business(
        db,
        owner_id=str(user["id"]),
        name=f"{first_name}'s Business",
    )

    # 3. Back-fill the user's business_id now that the business exists
    user_repository.update_user_fields(
        db, str(user["id"]), business_id=str(business["id"])
    )

    db.commit()

    logger.info("New signup: user=%s business=%s", user["id"], business["id"])

    # 4. Send verification email (fire-and-forget, after commit)
    verification_token = create_email_verification_token(str(user["id"]))
    email_service.send_verification_email(to=email, token=verification_token)

    return create_access_token(str(user["id"]),str(business["id"]),"owner")

# ── Login ────────────────────────────────────────────────────────────────────

def login(db: Session, *, email: str, password: str) -> str:
    """Authenticate with email + password.  Returns a JWT.

    Raises ``AuthError`` with 401 on invalid credentials.
    The error message is deliberately vague to prevent email enumeration.
    """
    user = user_repository.get_user_by_email(db, email)
    if not user or not verify_password(password, user["password_hash"]):
        raise AuthError(
            message="Incorrect email or password",
            status_code=401,
        )

    logger.info("Login: user=%s", user["id"])

    return create_access_token(
        str(user["id"]),
        str(user["business_id"]) if user["business_id"] else None,
        user["role"]
    )


# ── OTP ──────────────────────────────────────────────────────────────────────
#
# MVP implementation: generates a 6-digit code, stores it in-memory.
# Production would use Redis with TTL.

_OTP_STORE: dict[str, tuple[str, datetime]] = {}  # email → (code, expires_at)
_OTP_TTL_SECONDS = 300  # 5 minutes
_OTP_ATTEMPTS: dict[str, int] = {}
_MAX_OTP_ATTEMPTS = 5


def request_otp(db: Session, *, email: str) -> None:
    """Generate a 6-digit OTP and send it via email.

    Always returns without error — never reveals whether the email exists.
    """
    user = user_repository.get_user_by_email(db, email)
    if not user:
        # Do not reveal whether the email exists — always return success
        logger.warning("OTP requested for non-existent email: %s", email)
        return

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_OTP_TTL_SECONDS)

    _OTP_STORE[email.lower()] = (code, expires_at)

    logger.info("OTP for %s: %s (expires in %ds)", email, code, _OTP_TTL_SECONDS)
    email_service.send_otp_email(to=email, code=code)


def verify_otp(db: Session, *, email: str, code: str) -> str:
    """Verify a previously issued OTP.  Returns a JWT on success.

    Raises ``AuthError`` with 401 if the code is wrong, expired, or was
    never issued.
    """
    key = email.lower()
    stored = _OTP_STORE.get(key)

    if not stored:
        raise AuthError(message="Invalid or expired code", status_code=401)

    attempts = _OTP_ATTEMPTS.get(key, 0)
    if attempts >= _MAX_OTP_ATTEMPTS:
        del _OTP_STORE[key]
        _OTP_ATTEMPTS.pop(key, None)

        logger.warning("OTP attempts exceeded for email: %s", email)
        raise AuthError(message="Too many attempts. Request a new OTP.", status_code=429)

    stored_code, expires_at = stored
    if datetime.now(timezone.utc) > expires_at or not hmac.compare_digest(stored_code, code):
        _OTP_ATTEMPTS[key] = attempts + 1
        raise AuthError(message="Invalid or expired code", status_code=401)

    # Consume the OTP — single use
    del _OTP_STORE[key]
    _OTP_ATTEMPTS.pop(key)

    user = user_repository.get_user_by_email(db, email)
    if not user:
        raise AuthError(message="Invalid or expired code", status_code=401)

    logger.info("OTP verified: user=%s", user["id"])

    return create_access_token(
        str(user["id"]),
        str(user["business_id"]) if user["business_id"] else None,
        user["role"]
    )


# ── Password reset ───────────────────────────────────────────────────────────
#
# Same in-memory approach as OTP for the MVP.

_RESET_STORE: dict[str, tuple[str, datetime]] = {}  # token → (email, expires_at)
_RESET_TTL_SECONDS = 3600  # 1 hour


def forgot_password(db: Session, *, email: str) -> None:
    """Generate a password-reset token and send it via email.

    Always returns without error — never reveals whether the email exists.
    Invalidates any previously issued reset tokens for this email.
    """
    user = user_repository.get_user_by_email(db, email)
    if not user:
        # Never reveal whether the email exists
        logger.warning("Password reset requested for non-existent email: %s", email)
        return

    # Invalidate any existing reset tokens for this email
    stale_keys = [k for k, v in _RESET_STORE.items() if v[0] == email.lower()]
    for k in stale_keys:
        del _RESET_STORE[k]

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_RESET_TTL_SECONDS)
    _RESET_STORE[token] = (email.lower(), expires_at)

    logger.info("Password reset token for %s: %s", email, token)
    email_service.send_password_reset_email(to=email, token=token)


def reset_password(db: Session, *, token: str, new_password: str) -> None:
    """Set a new password using a previously issued reset token.

    Raises ``AuthError`` with 400 if the token is invalid or expired.
    """
    stored = _RESET_STORE.get(token)
    if not stored:
        raise AuthError(message="Invalid or expired reset link", status_code=400)

    email, expires_at = stored
    if datetime.now(timezone.utc) > expires_at:
        del _RESET_STORE[token]
        raise AuthError(message="Invalid or expired reset link", status_code=400)

    user = user_repository.get_user_by_email(db, email)
    if not user:
        raise AuthError(message="Invalid or expired reset link", status_code=400)

    user_repository.update_user_fields(
        db, str(user["id"]), password_hash=hash_password(new_password)
    )
    db.commit()

    # Consume the token — single use
    del _RESET_STORE[token]

    logger.info("Password reset completed: user=%s", user["id"])


# ── Email verification ───────────────────────────────────────────────────────

_VERIFY_STORE: dict[str, tuple[str, datetime]] = {}  # token → (user_id, expires_at)
_VERIFY_TTL_SECONDS = 86400  # 24 hours


def create_email_verification_token(user_id: str) -> str:
    """Generate a verification token for a newly created user.

    Called automatically during signup.  The token is stored in-memory
    with a 24-hour TTL and the verification email is sent by the caller.
    """
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_VERIFY_TTL_SECONDS)
    _VERIFY_STORE[token] = (user_id, expires_at)
    logger.info("Email verification token for user %s: %s", user_id, token)
    return token


def verify_email(db: Session, *, token: str) -> None:
    """Mark a user's email as verified.

    Raises ``AuthError`` with 400 if the token is invalid or expired.
    """
    stored = _VERIFY_STORE.get(token)
    if not stored:
        raise AuthError(message="Invalid verification link", status_code=400)

    user_id, expires_at = stored
    if datetime.now(timezone.utc) > expires_at:
        del _VERIFY_STORE[token]
        raise AuthError(message="Verification link has expired", status_code=400)

    user_repository.update_user_fields(
        db,
        user_id,
        email_verified_at=datetime.now(timezone.utc).isoformat(),
    )
    db.commit()

    del _VERIFY_STORE[token]
    logger.info("Email verified: user=%s", user_id)
