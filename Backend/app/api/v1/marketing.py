# /api/v1/marketing.py
# Endpoints: POST /waitlist, POST /demo/book
# These are already wired in the live frontend — implement these first.

from fastapi import APIRouter

router = APIRouter(prefix="/marketing", tags=["marketing"])