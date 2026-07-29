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


def list_users(db: Session) -> list[dict]:
    """All business owner/staff users (never admins), newest first.

    Joined with the business name for the admin panel's Users table.
    """
    rows = db.execute(
        text("""
            SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.phone,
                   u.country_code, u.email_verified_at, u.created_at,
                   b.name AS business_name
            FROM users u
            LEFT JOIN businesses b ON b.id = u.business_id
            WHERE u.role != 'admin'
            ORDER BY u.created_at DESC
        """)
    ).fetchall()
    return [dict(row._mapping) for row in rows]


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
    "status", "invite_token", "accepted_at",
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
        params
    )
    db.commit()


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


def get_business_by_id(db: Session, business_id: str) -> dict | None:
    """Fetch one business by primary key. Used for trial-date calculations."""
    row = db.execute(
        text("SELECT * FROM businesses WHERE id = :id"),
        {"id": business_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def get_business_by_whatsapp_number(db: Session, whatsapp_number: str) -> dict | None:
    """Fetch the business connected to this WhatsApp number, used by the
    webhook to route an inbound message to its tenant. Compares
    digits-only so formatting differences (+92 vs 92, spaces, dashes)
    between what's stored and what Meta sends don't cause a silent miss."""
    row = db.execute(
        text("""
            SELECT * FROM businesses
            WHERE regexp_replace(whatsapp_number, '[^0-9]', '', 'g')
                = regexp_replace(:number, '[^0-9]', '', 'g')
        """),
        {"number": whatsapp_number},
    ).fetchone()
    return dict(row._mapping) if row else None


_BUSINESS_ALLOWED_FIELDS = frozenset({
    "name", "industry", "description", "support_email", "support_phone",
    "logo_url", "whatsapp_number", "whatsapp_connected_at",
    "delivery_charge", "delivery_areas", "delivery_estimated_time",
    "cash_on_delivery", "pickup_available",
    "tax_rate", "tax_name", "prices_include_tax",
    "payment_details",
    "language",
})


def update_business_fields(db: Session, business_id: str, **fields) -> dict:
    """Update arbitrary columns on the one existing business row.

    Always an UPDATE, never an INSERT — a business is created once at
    signup, every settings save from here on just fills in that same row.
    """
    invalid = set(fields) - _BUSINESS_ALLOWED_FIELDS
    if invalid:
        raise ValueError(f"Disallowed fields: {invalid}")

    if not fields:
        return get_business_by_id(db, business_id)

    set_clause = ", ".join(f"{key} = :{key}" for key in fields)
    row = db.execute(
        text(f"""
            UPDATE businesses
            SET {set_clause}, updated_at = NOW()
            WHERE id = :business_id
            RETURNING *
        """),
        {**fields, "business_id": business_id},
    ).fetchone()
    return dict(row._mapping)
