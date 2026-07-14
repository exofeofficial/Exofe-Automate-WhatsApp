# scripts/create_admin.py
# Run this once on your machine (or the server) to create an Exofe admin
# account. There's no signup form for this on purpose, only people who can
# run a script on the server should be able to make themselves an admin.
#
# Usage:
#   .venv/Scripts/python -m app.scripts.create_admin

import getpass
import uuid

from sqlalchemy import text

from app.core.security import hash_password
from app.database.session import SessionLocal


def main() -> None:
    email = input("Admin email: ").strip()
    first_name = input("First name: ").strip()
    last_name = input("Last name: ").strip()
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")

    if password != confirm:
        print("Those passwords don't match, nothing was created.")
        return

    if len(password) < 8:
        print("Password should be at least 8 characters, nothing was created.")
        return

    db = SessionLocal()
    try:
        existing = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).first()
        if existing:
            print(f"A user with {email} already exists, nothing was created.")
            return

        db.execute(
            text(
                """
                INSERT INTO users (id, business_id, role, first_name, last_name, email, password_hash, email_verified_at)
                VALUES (:id, NULL, 'admin', :first_name, :last_name, :email, :password_hash, NOW())
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "password_hash": hash_password(password),
            },
        )
        db.commit()
        print(f"Admin account created for {email}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
