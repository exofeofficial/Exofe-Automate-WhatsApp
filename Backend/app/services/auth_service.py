import secrets
from datetime import datetime, timedelta, timezone
import hmac

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.config import settings
from app.core.logger import get_logger
from app.core.security import create_access_token, hash_password, verify_password
from app.repositories import subscription_repository, team_repository, user_repository
from app.services import email_service


logger = get_logger(__name__)

# Business rule from the PRD: every new signup gets a 7 day free trial.
TRIAL_LENGTH_DAYS = 7

# A hash of a value nobody will ever type in. Verified against on every
# login for an email that doesn't exist, so the bcrypt comparison always
# runs and a wrong-password attempt on a real account can't be timed
# against a nonexistent-account attempt to enumerate registered emails.
_DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


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

    # 4. Start the 7 day free trial — one subscriptions row per business,
    # filled in later (plan/status/amount) once they activate a paid plan.
    trial_ends_at = business["created_at"] + timedelta(days=TRIAL_LENGTH_DAYS)
    subscription_repository.create_trial_subscription(
        db, business_id=str(business["id"]), business_name=business["name"], trial_ends_at=trial_ends_at
    )

    db.commit()

    logger.info("New signup: user=%s business=%s", user["id"], business["id"])

    # 5. Send verification email (fire-and-forget, after commit)
    verification_code = create_email_verification_code(email)
    email_service.send_verification_email(email, verification_code)

    return create_access_token(str(user["id"]),str(business["id"]),"owner")

# ── Login ────────────────────────────────────────────────────────────────────

def login(db: Session, *, email: str, password: str) -> str:
    """Authenticate with email + password.  Returns a JWT.

    Raises ``AuthError`` with 401 on invalid credentials.
    The error message is deliberately vague to prevent email enumeration.
    """
    user = user_repository.get_user_by_email(db, email)
    # Always run the bcrypt comparison, even for an unknown email, so a
    # missing account can't be distinguished from a wrong password by timing.
    password_hash = user["password_hash"] if user else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(password, password_hash)
    if not user or not password_ok:
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


# ── Google sign-in ───────────────────────────────────────────────────────────

def google_login(db: Session, *, id_token: str) -> str:
    """Verify a Google ID token (from Google Identity Services on the
    frontend) and log the user in — creating an account and a 7 day trial
    on first sign-in, same as email/password signup.

    Raises ``AuthError`` with 401 if the token is invalid, unverified, or
    belongs to an admin account (admins only use the password login).
    """
    if not settings.google_client_id:
        raise AuthError(message="Google sign-in isn't configured", status_code=501)

    try:
        payload = google_id_token.verify_oauth2_token(
            id_token, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise AuthError(message="Invalid Google sign-in", status_code=401)

    if not payload.get("email_verified"):
        raise AuthError(message="Your Google email isn't verified", status_code=401)

    email = payload["email"].lower()
    user = user_repository.get_user_by_email(db, email)

    if user:
        if user["role"] == "admin":
            raise AuthError(message="Use the admin login instead", status_code=401)

        logger.info("Google login: user=%s", user["id"])
        return create_access_token(
            str(user["id"]),
            str(user["business_id"]) if user["business_id"] else None,
            user["role"],
        )

    # First time seeing this email — create an account. Same shape as a
    # normal signup, just with a random unusable password (they can set
    # a real one later via forgot-password if they ever want email/password
    # login too) and the email is already verified by Google.
    first_name = payload.get("given_name") or (payload.get("name", "there").split(" ")[0])
    last_name = payload.get("family_name") or ""

    new_user = user_repository.create_user(
        db,
        role="owner",
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        phone=None,
        country_code=None,
    )
    business = user_repository.create_business(
        db, owner_id=str(new_user["id"]), name=f"{first_name}'s Business"
    )
    user_repository.update_user_fields(
        db,
        str(new_user["id"]),
        business_id=str(business["id"]),
        email_verified_at=datetime.now(timezone.utc).isoformat(),
    )

    trial_ends_at = business["created_at"] + timedelta(days=TRIAL_LENGTH_DAYS)
    subscription_repository.create_trial_subscription(
        db, business_id=str(business["id"]), business_name=business["name"], trial_ends_at=trial_ends_at
    )

    db.commit()
    logger.info("New Google signup: user=%s business=%s", new_user["id"], business["id"])

    return create_access_token(str(new_user["id"]), str(business["id"]), "owner")


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

    if settings.resend_api_key:
        logger.info("OTP issued for %s (expires in %ds)", email, _OTP_TTL_SECONDS)
    else:
        # No email provider configured — this is the only way to see the
        # code locally, so it's fine to print it. Never do this once
        # RESEND_API_KEY is set, since app.log is persisted to disk.
        logger.info("[dev] OTP for %s: %s (expires in %ds)", email, code, _OTP_TTL_SECONDS)
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
    _OTP_ATTEMPTS.pop(key, None)

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
# Same 6-digit-code approach as login OTP — the frontend has a single
# CodeInput-based flow for both, so this needs to behave identically.

_RESET_STORE: dict[str, tuple[str, datetime]] = {}  # email → (code, expires_at)
_RESET_TTL_SECONDS = 300  # 5 minutes
_RESET_ATTEMPTS: dict[str, int] = {}
_MAX_RESET_ATTEMPTS = 5


def forgot_password(db: Session, *, email: str) -> None:
    """Generate a 6-digit password-reset code and send it via email.

    Always returns without error — never reveals whether the email exists.
    Overwriting the store entry invalidates any previously issued code for
    this email.
    """
    user = user_repository.get_user_by_email(db, email)
    if not user:
        # Never reveal whether the email exists
        logger.warning("Password reset requested for non-existent email: %s", email)
        return

    key = email.lower()
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_RESET_TTL_SECONDS)
    _RESET_STORE[key] = (code, expires_at)

    if settings.resend_api_key:
        logger.info("Password reset code issued for %s", email)
    else:
        logger.info("[dev] Password reset code for %s: %s", email, code)
    email_service.send_password_reset_email(to=email, code=code)


def reset_password(db: Session, *, email: str, code: str, new_password: str) -> None:
    """Set a new password using a previously issued 6-digit reset code.

    Raises ``AuthError`` with 400 if the code is wrong, expired, or was
    never issued; 429 if too many wrong codes have been tried.
    """
    key = email.lower()
    stored = _RESET_STORE.get(key)

    if not stored:
        raise AuthError(message="Invalid or expired code", status_code=400)

    attempts = _RESET_ATTEMPTS.get(key, 0)
    if attempts >= _MAX_RESET_ATTEMPTS:
        del _RESET_STORE[key]
        _RESET_ATTEMPTS.pop(key, None)
        logger.warning("Reset code attempts exceeded for email: %s", email)
        raise AuthError(message="Too many attempts. Request a new code.", status_code=429)

    stored_code, expires_at = stored
    if datetime.now(timezone.utc) > expires_at or not hmac.compare_digest(stored_code, code):
        _RESET_ATTEMPTS[key] = attempts + 1
        raise AuthError(message="Invalid or expired code", status_code=400)

    user = user_repository.get_user_by_email(db, email)
    if not user:
        raise AuthError(message="Invalid or expired code", status_code=400)

    user_repository.update_user_fields(
        db, str(user["id"]), password_hash=hash_password(new_password)
    )
    db.commit()

    # Consume the code — single use
    del _RESET_STORE[key]
    _RESET_ATTEMPTS.pop(key, None)

    logger.info("Password reset completed: user=%s", user["id"])


# ── Email verification ───────────────────────────────────────────────────────
#
# Same 6-digit-code approach as login OTP, so the user types a short code
# instead of copy-pasting a long token.

_VERIFY_STORE: dict[str, tuple[str, datetime]] = {}  # email → (code, expires_at)
_VERIFY_TTL_SECONDS = 1800  # 30 minutes
_VERIFY_ATTEMPTS: dict[str, int] = {}
_MAX_VERIFY_ATTEMPTS = 5


def create_email_verification_code(email: str) -> str:
    """Generate a 6-digit verification code for a newly created user.

    Called automatically during signup.  The code is stored in-memory
    with a 30-minute TTL and the verification email is sent by the caller.
    """
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=_VERIFY_TTL_SECONDS)
    _VERIFY_STORE[email.lower()] = (code, expires_at)
    if settings.resend_api_key:
        logger.info("Email verification code issued for %s", email)
    else:
        logger.info("[dev] Email verification code for %s: %s", email, code)
    return code


def verify_email(db: Session, *, email: str, code: str) -> None:
    """Mark a user's email as verified.

    Raises ``AuthError`` with 400 if the code is wrong, expired, or was
    never issued.
    """
    key = email.lower()
    stored = _VERIFY_STORE.get(key)

    if not stored:
        raise AuthError(message="Invalid or expired code", status_code=400)

    attempts = _VERIFY_ATTEMPTS.get(key, 0)
    if attempts >= _MAX_VERIFY_ATTEMPTS:
        del _VERIFY_STORE[key]
        _VERIFY_ATTEMPTS.pop(key, None)
        logger.warning("Verification attempts exceeded for email: %s", email)
        raise AuthError(message="Too many attempts. Request a new code.", status_code=429)

    stored_code, expires_at = stored
    if datetime.now(timezone.utc) > expires_at or not hmac.compare_digest(stored_code, code):
        _VERIFY_ATTEMPTS[key] = attempts + 1
        raise AuthError(message="Invalid or expired code", status_code=400)

    # Consume the code — single use
    del _VERIFY_STORE[key]
    _VERIFY_ATTEMPTS.pop(key, None)

    user = user_repository.get_user_by_email(db, email)
    if not user:
        raise AuthError(message="Invalid or expired code", status_code=400)

    user_repository.update_user_fields(
        db,
        str(user["id"]),
        email_verified_at=datetime.now(timezone.utc).isoformat(),
    )
    db.commit()

    logger.info("Email verified: user=%s", user["id"])


# ── Team invites ──────────────────────────────────────────────────────────────
#
# Unlike the 6-digit-code flows above, an invite is a persisted DB token
# (see team_service.invite_member) rather than an in-memory store — it's a
# "magic link" a person clicks from their email, not a code they type in.

def _get_valid_invite(db: Session, token: str) -> dict:
    invite = team_repository.get_by_invite_token(db, token)
    if not invite or invite["status"] != "invited":
        raise AuthError(message="This invite link is invalid or has already been used", status_code=404)

    expires_at = invite["invite_token_expires_at"]
    if expires_at and datetime.now(timezone.utc) > expires_at:
        raise AuthError(message="This invite link has expired — ask for a new one", status_code=404)

    return invite


def get_invite_details(db: Session, *, token: str) -> dict:
    """Read-only lookup for the accept-invite landing page, so it can show
    "You've been invited to join X as Y" before asking for anything."""
    invite = _get_valid_invite(db, token)
    return {
        "business_name": invite["business_name"],
        "email": invite["email"],
        "role": invite["role"],
    }


def accept_invite(db: Session, *, token: str, first_name: str, last_name: str, password: str) -> str:
    """Complete a team invite — sets the person's name/password, marks
    them active, and returns a JWT so they land straight in the
    dashboard, same as signup/login.
    """
    invite = _get_valid_invite(db, token)
    user_id = str(invite["id"])

    user_repository.update_user_fields(
        db,
        user_id,
        first_name=first_name,
        last_name=last_name,
        password_hash=hash_password(password),
        status="active",
        invite_token=None,
        accepted_at=datetime.now(timezone.utc).isoformat(),
    )
    db.commit()

    logger.info("Invite accepted: user=%s business=%s", user_id, invite["business_id"])

    return create_access_token(user_id, str(invite["business_id"]), invite["role"])
