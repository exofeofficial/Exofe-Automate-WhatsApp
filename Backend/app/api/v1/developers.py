# app/api/v1/developers.py
# Dashboard-facing API key management (JWT-authed) — what the Settings
# page's "Developers" section calls. The keys minted here are what
# external integrations then use against /v1/public (see public.py),
# authenticated with an API key instead of a login token.
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.core.rate_limit import limiter
from app.database.session import get_db
from app.models.api_key import (
    ApiKeyCreatedResponse,
    ApiKeyCreateRequest,
    ApiKeyListResponse,
    ApiKeyResponse,
    MessageResponse,
)
from app.models.product import SyncStatsResponse
from app.services import api_key_service, catalog_service

router = APIRouter(prefix="/developers/api-keys", tags=["developers"])
# separate from the api-keys router above since it's not about keys — it's
# what the Developers tab shows to prove a developer's integration is
# actually pushing data in, not just that a key exists
stats_router = APIRouter(prefix="/developers", tags=["developers"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


@router.get("", response_model=ApiKeyListResponse)
def list_keys(db: DbSession, current: CurrentOwner) -> ApiKeyListResponse:
    business_id = _require_business(current)
    keys = api_key_service.list_keys(db, business_id)
    return ApiKeyListResponse(keys=[ApiKeyResponse(**k) for k in keys])


@router.post("", response_model=ApiKeyCreatedResponse, status_code=201)
@limiter.limit("10/hour")
def create_key(request: Request, body: ApiKeyCreateRequest, db: DbSession, current: CurrentOwner) -> ApiKeyCreatedResponse:
    business_id = _require_business(current)
    key, raw_key = api_key_service.generate_key(db, business_id, body.name)
    return ApiKeyCreatedResponse(key=ApiKeyResponse(**key), raw_key=raw_key)


@router.delete("/{key_id}", response_model=MessageResponse)
def revoke_key(key_id: str, db: DbSession, current: CurrentOwner) -> MessageResponse:
    business_id = _require_business(current)
    api_key_service.revoke_key(db, business_id, key_id)
    return MessageResponse(message="API key revoked")


@stats_router.get("/sync-stats", response_model=SyncStatsResponse)
def get_sync_stats(db: DbSession, current: CurrentOwner) -> SyncStatsResponse:
    business_id = _require_business(current)
    stats = catalog_service.get_sync_stats(db, business_id)
    return SyncStatsResponse(**stats)
