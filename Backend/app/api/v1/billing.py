# /api/v1/billing.py
# Endpoints: GET /billing/subscription, POST /billing/subscribe, POST /billing/cancel, GET /billing/payments

from fastapi import APIRouter

router = APIRouter(prefix="/billing", tags=["billing"])
