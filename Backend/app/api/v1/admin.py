# /api/v1/admin.py
# Exofe-team only. Endpoints: /admin/users, /admin/clients, /admin/subscriptions,
# /admin/revenue, /admin/logs, /admin/feature-flags

from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])
