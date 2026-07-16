# app/models/team.py

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class TeamMember(_CamelModel):
    id: str
    name: str
    email: str
    role: str  # "owner" | "admin" | "staff"
    status: str  # "active" | "invited"


class TeamMembersResponse(BaseModel):
    members: list[TeamMember]


class TeamMemberResponse(BaseModel):
    member: TeamMember


class InviteTeamMemberRequest(_CamelModel):
    email: EmailStr
    # "owner" deliberately excluded — there's exactly one owner (whoever
    # signed up) and these endpoints can't create or assign a second one.
    role: str = Field(..., pattern=r"^(admin|staff)$")


class UpdateRoleRequest(_CamelModel):
    role: str = Field(..., pattern=r"^(admin|staff)$")


class MessageResponse(BaseModel):
    message: str