# app/repositories/team_repository.py
from sqlalchemy import text
from sqlalchemy.orm import Session

_MEMBER_COLUMNS = "id, first_name, last_name, email, role, status"


def list_team_members(db: Session, business_id: str) -> list[dict]:
    rows = db.execute(
        text(
            f"""
            SELECT {_MEMBER_COLUMNS} FROM users
            WHERE business_id = :business_id
            ORDER BY (role = 'owner') DESC, created_at
            """
        ),
        {"business_id": business_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def get_member(db: Session, business_id: str, user_id: str) -> dict | None:
    row = db.execute(
        text(f"SELECT {_MEMBER_COLUMNS} FROM users WHERE id = :user_id AND business_id = :business_id"),
        {"user_id": user_id, "business_id": business_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def get_by_email(db: Session, email: str) -> dict | None:
    row = db.execute(
        text("SELECT id, business_id FROM users WHERE email = :email"),
        {"email": email},
    ).fetchone()
    return dict(row._mapping) if row else None


def get_by_invite_token(db: Session, invite_token: str) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT u.id, u.business_id, u.email, u.role, u.status, u.invite_token_expires_at,
                   b.name AS business_name
            FROM users u
            JOIN businesses b ON b.id = u.business_id
            WHERE u.invite_token = :invite_token
            """
        ),
        {"invite_token": invite_token},
    ).fetchone()
    return dict(row._mapping) if row else None


def create_invited_member(
    db: Session, *, business_id: str, email: str, role: str, invite_token: str, invite_token_expires_at
) -> dict:
    """first_name/last_name start blank — filled in when the invited
    person completes the accept-invite flow. Until then, the service
    layer falls back to showing their email as the display name."""
    row = db.execute(
        text(
            f"""
            INSERT INTO users (business_id, role, first_name, last_name, email, password_hash,
                                status, invite_token, invite_token_expires_at, invited_at)
            VALUES (:business_id, :role, '', '', :email, NULL, 'invited', :invite_token,
                    :invite_token_expires_at, NOW())
            RETURNING {_MEMBER_COLUMNS}
            """
        ),
        {
            "business_id": business_id,
            "role": role,
            "email": email,
            "invite_token": invite_token,
            "invite_token_expires_at": invite_token_expires_at,
        },
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def update_role(db: Session, business_id: str, user_id: str, role: str) -> dict | None:
    row = db.execute(
        text(
            f"""
            UPDATE users SET role = :role, updated_at = NOW()
            WHERE id = :user_id AND business_id = :business_id AND role != 'owner'
            RETURNING {_MEMBER_COLUMNS}
            """
        ),
        {"role": role, "user_id": user_id, "business_id": business_id},
    ).fetchone()
    db.commit()
    return dict(row._mapping) if row else None


def delete_member(db: Session, business_id: str, user_id: str) -> bool:
    result = db.execute(
        text("DELETE FROM users WHERE id = :user_id AND business_id = :business_id AND role != 'owner'"),
        {"user_id": user_id, "business_id": business_id},
    )
    db.commit()
    return result.rowcount > 0