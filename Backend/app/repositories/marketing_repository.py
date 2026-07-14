# repositories/marketing_repository.py
# Raw SQL for the waitlist and demo_leads tables. Every value goes in as a
# bound parameter, never string-formatted into the query, so this stays
# safe from SQL injection regardless of what a caller sends.

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def add_to_waitlist(db: Session, email: str) -> None:
    """Insert an email into the waitlist. Signing up twice with the same
    email is not an error, the caller should treat this as always
    succeeding, that's friendlier than telling someone "you're already on
    the list" and it avoids confirming an email exists in our system."""
    try:
        db.execute(
            text("INSERT INTO waitlist (email) VALUES (:email)"),
            {"email": email},
        )
        db.commit()
    except IntegrityError:
        db.rollback()


def create_demo_lead(
    db: Session,
    *,
    name: str,
    email: str,
    billing_country: str,
    country_code: str,
    phone: str,
    team: str,
) -> None:
    db.execute(
        text(
            """
            INSERT INTO demo_leads (name, email, billing_country, country_code, phone, team)
            VALUES (:name, :email, :billing_country, :country_code, :phone, :team)
            """
        ),
        {
            "name": name,
            "email": email,
            "billing_country": billing_country,
            "country_code": country_code,
            "phone": phone,
            "team": team,
        },
    )
    db.commit()
