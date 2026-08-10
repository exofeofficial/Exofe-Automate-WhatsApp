# core/security.py
# Password hashing and JWT helpers. This is shared by every login flow,
# admin login now, business owner signup/login later.

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

API_KEY_PREFIX = "exf_live_"


def generate_api_key() -> tuple[str, str, str]:
    """Returns (raw_key, key_prefix, key_hash). The raw key is shown to
    the business owner exactly once, at creation — only the hash is ever
    stored, so a leaked database can't be used to impersonate a
    developer's integration. Plain SHA-256 (not bcrypt) on purpose: the
    key itself is already 256 bits of randomness, so it doesn't need a
    slow, salted hash the way a human-chosen password does — a lookup
    needs to be fast since it runs on every public API request."""
    raw_key = API_KEY_PREFIX + secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    return raw_key, raw_key[:12], key_hash


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(user_id: str, business_id: str | None, role: str) -> str:
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET is not set, can't create a login token")

    to_encode = {
        "sub": user_id,
        "business_id": business_id,
        "role": role,
    }
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    if not settings.jwt_secret:
        return None
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
