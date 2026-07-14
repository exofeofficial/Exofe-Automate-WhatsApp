"""
Raw SQL queries for the users and businesses tables.

Every function receives a SQLAlchemy ``Session`` as its first argument —
repositories are plain Python, never FastAPI-aware.
"""

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.logger import get_logger

logger = get_logger(__name__)

# ── Users ────────────────────────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> dict | None:
    """Return a single user row as a dict, or ``None`` if not found."""
    row = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": email},
    ).fetchone()
    return dict(row._mapping) if row else None


def get_user_by_id(db: Session, user_id: str) -> dict | None:
    """Fetch one user by primary key."""
    row = db.execute(
        text("SELECT * FROM users WHERE id = :id"),
        {"id": user_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def create_user(
    db: Session,
    *,
    role: str,
    first_name: str,
    last_name: str,
    email: str,
    password_hash: str,
    phone: str,
    country_code: str,
    business_id: str | None = None,
) -> dict:
    """Insert a new user and return the created row."""
    row = db.execute(
        text("""
            INSERT INTO users
                (business_id, role, first_name, last_name, email,
                 password_hash, phone, country_code)
            VALUES
                (:business_id, :role, :first_name, :last_name, :email,
                 :password_hash, :phone, :country_code)
            RETURNING *
        """),
        {
            "business_id": business_id,
            "role": role,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password_hash": password_hash,
            "phone": phone,
            "country_code": country_code,
        },
    ).fetchone()
    return dict(row._mapping)



_ALLOWED_FIELDS = frozenset({
    "business_id", "password_hash", "email_verified_at",
    "first_name", "last_name", "phone", "country_code",
})
def update_user_fields(db: Session, user_id: str, **fields) -> None:
    """Update arbitrary columns on a user row.

    Only the keyword arguments that are passed will be SET.
    Callers use this for email verification, password resets, etc.
    """
    
    invalid = set(fields) - _ALLOWED_FIELDS
    
    if invalid:
        logger.warning(f"Invalid fields: {invalid}")
        raise ValueError(f"Disallowed fields: {invalid}")
    
    if not fields:
        return

    set_clause = ", ".join(f"{col} = :{col}" for col in fields)
    params = {**fields, "id": user_id}
    db.execute(
        text(f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = :id"),
        params,
    )


# ── Businesses ───────────────────────────────────────────────────────────────

def create_business(
    db: Session,
    *,
    owner_id: str,
    name: str,
) -> dict:
    """Insert a new business row and return it."""
    row = db.execute(
        text("""
            INSERT INTO businesses (owner_id, name)
            VALUES (:owner_id, :name)
            RETURNING *
        """),
        {"owner_id": owner_id, "name": name},
    ).fetchone()
    return dict(row._mapping)