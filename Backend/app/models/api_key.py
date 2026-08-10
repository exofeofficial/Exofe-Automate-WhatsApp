# app/models/api_key.py

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ApiKeyCreateRequest(_CamelModel):
    name: str = Field(..., min_length=1, max_length=100)


class ApiKeyResponse(_CamelModel):
    """Never carries the raw key — only ApiKeyCreatedResponse does, and
    only once, right after creation."""

    id: str
    name: str
    key_prefix: str
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class ApiKeyCreatedResponse(_CamelModel):
    key: ApiKeyResponse
    raw_key: str


class ApiKeyListResponse(_CamelModel):
    keys: list[ApiKeyResponse]


class MessageResponse(_CamelModel):
    message: str
