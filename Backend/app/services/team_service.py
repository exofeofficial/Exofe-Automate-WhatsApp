# app/services/team_service.py

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories import team_repository, user_repository
from app.services import email_service

INVITE_TOKEN_TTL_DAYS = 7


def _to_member(row: dict) -> dict:
    name = f"{row['first_name']} {row['last_name']}".strip()
    return {
        "id": str(row["id"]),
        "name": name or row["email"],  # blank until the (future) accept-invite flow fills it in
        "email": row["email"],
        "role": row["role"],
        "status": row["status"],
    }


def list_members(db: Session, business_id: str) -> list[dict]:
    return [_to_member(r) for r in team_repository.list_team_members(db, business_id)]


def invite_member(db: Session, business_id: str, *, email: str, role: str) -> dict:
    if team_repository.get_by_email(db, email):
        raise AppError(409, "Someone with this email already has an account")

    business = user_repository.get_business_by_id(db, business_id)
    invite_token = secrets.token_urlsafe(24)
    invite_token_expires_at = datetime.now(timezone.utc) + timedelta(days=INVITE_TOKEN_TTL_DAYS)

    row = team_repository.create_invited_member(
        db,
        business_id=business_id,
        email=email,
        role=role,
        invite_token=invite_token,
        invite_token_expires_at=invite_token_expires_at,
    )
    email_service.send_team_invite_email(email, business["name"], invite_token)
    return _to_member(row)


def _get_member_or_404(db: Session, business_id: str, user_id: str) -> dict:
    member = team_repository.get_member(db, business_id, user_id)
    if not member:
        raise AppError(404, "Team member not found")
    return member


def update_role(db: Session, business_id: str, user_id: str, role: str) -> dict:
    member = _get_member_or_404(db, business_id, user_id)
    if member["role"] == "owner":
        raise AppError(403, "The account owner's role can't be changed")

    updated = team_repository.update_role(db, business_id, user_id, role)
    return _to_member(updated)


def remove_member(db: Session, business_id: str, user_id: str) -> None:
    member = _get_member_or_404(db, business_id, user_id)
    if member["role"] == "owner":
        raise AppError(403, "The account owner can't be removed")

    team_repository.delete_member(db, business_id, user_id)