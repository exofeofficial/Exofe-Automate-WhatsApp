# app/api/v1/team.py
# Endpoints: GET /team, POST /team/invite, PATCH /team/:id/role, DELETE /team/:id
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.team import (
    InviteTeamMemberRequest,
    MessageResponse,
    TeamMember,
    TeamMemberResponse,
    TeamMembersResponse,
    UpdateRoleRequest,
)
from app.services import team_service

router = APIRouter(prefix="/team", tags=["team"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]

def _require_team_manager(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    if current.role not in ("owner", "admin"):
        raise AppError(403, "Only owners and admins can manage the team")
    return current.business_id


@router.get("", response_model=TeamMembersResponse)
def list_members(db: DbSession, current: CurrentOwner) -> TeamMembersResponse:
    business_id = _require_team_manager(current)
    members = team_service.list_members(db, business_id)
    return TeamMembersResponse(members=[TeamMember(**m) for m in members])


@router.post("/invite", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def invite_member(
    body: InviteTeamMemberRequest, db: DbSession, current: CurrentOwner
) -> TeamMemberResponse:
    business_id = _require_team_manager(current)
    member = team_service.invite_member(db, business_id, email=body.email, role=body.role)
    return TeamMemberResponse(member=TeamMember(**member))


@router.patch("/{user_id}/role", response_model=TeamMemberResponse)
def update_role(
    user_id: str, body: UpdateRoleRequest, db: DbSession, current: CurrentOwner
) -> TeamMemberResponse:
    business_id = _require_team_manager(current)
    member = team_service.update_role(db, business_id, user_id, body.role)
    return TeamMemberResponse(member=TeamMember(**member))


@router.delete("/{user_id}", response_model=MessageResponse)
def remove_member(user_id: str, db: DbSession, current: CurrentOwner) -> MessageResponse:
    business_id = _require_team_manager(current)
    team_service.remove_member(db, business_id, user_id)
    return MessageResponse(message="Team member removed")