"""
JWT token management and password hashing utilities.

Uses pwdlib with Argon2 for password hashing (memory-hard, resistant to GPU
attacks) and PyJWT for token encoding/decoding.
"""

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.config import settings

# ── Password hashing (Argon2id) ─────────────────────────────────────────────

_password_hash = PasswordHash((Argon2Hasher(),))


def hash_password(plain_text: str) -> str:
    """Return an Argon2id hash of *plain_text*."""
    return _password_hash.hash(plain_text)


def verify_password(plain_text: str, hashed: str) -> bool:
    """Check *plain_text* against an existing Argon2id *hashed* value.

    Returns ``False`` on mismatch — never raises.
    """
    return _password_hash.verify(plain_text, hashed)


# ── JWT ──────────────────────────────────────────────────────────────────────

_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = timedelta(hours=1)


def create_access_token(
    user_id: str,
    business_id: str | None,
    role: str,
    *,
    expires_delta: timedelta = ACCESS_TOKEN_EXPIRE,
) -> str:
    """Create a signed JWT carrying the user's identity claims."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,                   # standard JWT subject claim
        "business_id": business_id,
        "role": role,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT.

    Raises ``jwt.ExpiredSignatureError`` if the token has expired and
    ``jwt.InvalidTokenError`` for any other validation failure.
    """
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[_ALGORITHM],
        options={"require": ["sub", "exp", "iat", "role"]},
    )