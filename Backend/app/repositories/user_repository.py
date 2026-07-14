# repositories/user_repository.py
# Raw SQL queries for the users table. No business logic here, only DB reads/writes.

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_user_by_email(db: Session, email: str) -> dict | None:
    row = (
        db.execute(
            text(
                """
                SELECT id, role, first_name, last_name, email, password_hash
                FROM users
                WHERE email = :email
                """
            ),
            {"email": email},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else None
