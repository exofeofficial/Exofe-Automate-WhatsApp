# core/security.py
# Password hashing and JWT helpers. This is shared by every login flow,
# admin login now, business owner signup/login later.

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7


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
