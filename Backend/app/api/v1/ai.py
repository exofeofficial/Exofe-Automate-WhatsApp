# /api/v1/ai.py
# Endpoints: GET /ai/settings, PATCH /ai/settings, GET /ai/faqs, POST /ai/faqs, PATCH /ai/faqs/{id}, DELETE /ai/faqs/{id}

from fastapi import APIRouter

router = APIRouter(prefix="/ai", tags=["ai"])
