# /api/v1/customers.py
# Endpoints: GET /customers, GET /customers/{id}, POST /customers/{id}/notes, GET /customers/{id}/notes

from fastapi import APIRouter

router = APIRouter(prefix="/customers", tags=["customers"])