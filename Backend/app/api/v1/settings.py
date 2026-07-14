# /api/v1/settings.py
# Endpoints: GET /settings/business, PATCH /settings/business, GET /settings/team, POST /settings/team, DELETE /settings/team/{id}

from fastapi import APIRouter

router = APIRouter(prefix="/settings", tags=["settings"])
