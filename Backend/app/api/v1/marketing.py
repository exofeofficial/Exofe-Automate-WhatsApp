# /api/v1/marketing.py
# Endpoints: POST /waitlist, POST /demo/book
# Mounted at the bare paths in main.py (not under /api/v1), that's what
# the live frontend already calls, see frontend/src/lib/api.ts.
# Both are public, no login needed, so they're rate limited per IP instead
# of relying on auth to keep bots from flooding them.

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.logger import get_logger
from app.core.rate_limit import limiter
from app.database.session import get_db
from app.models.marketing import DemoBookingRequest, MessageResponse, WaitlistRequest
from app.repositories import marketing_repository

logger = get_logger(__name__)
router = APIRouter()


@router.post("/waitlist", response_model=MessageResponse)
@limiter.limit("10/hour")
def join_waitlist(
    request: Request,
    payload: WaitlistRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    try:
        marketing_repository.add_to_waitlist(db, payload.email)
    except SQLAlchemyError:
        logger.exception("Failed to add %s to the waitlist", payload.email)
        raise AppError(500, "Couldn't join the waitlist right now, please try again.")

    return MessageResponse(message="You're on the list, we'll be in touch soon.")


@router.post("/demo/book", response_model=MessageResponse)
@limiter.limit("5/hour")
def book_demo(
    request: Request,
    payload: DemoBookingRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    try:
        marketing_repository.create_demo_lead(
            db,
            name=payload.name,
            email=payload.email,
            billing_country=payload.billing_country,
            country_code=payload.country_code,
            phone=payload.phone,
            team=payload.team,
        )
    except SQLAlchemyError:
        logger.exception("Failed to save demo booking for %s", payload.email)
        raise AppError(500, "Couldn't book your demo right now, please try again.")

    return MessageResponse(message="Thanks! Our team will reach out to book your demo.")
