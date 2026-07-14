# /api/v1/marketing.py
# Endpoints: POST /waitlist, POST /demo/book
# These get mounted at the plain paths in main.py, not under /api/v1,
# because that's what the frontend already calls (see
# frontend/src/lib/api.ts). No login is needed for either one, so we rate
# limit by IP to stop bots from spamming them.

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.core.logger import get_logger
from app.core.rate_limit import limiter
from app.database.session import get_db
from app.models.marketing import DemoBookingRequest, MessageResponse, WaitlistRequest
from app.repositories import marketing_repository
from app.services import email_service

logger = get_logger(__name__)
router = APIRouter()


@router.post("/waitlist", response_model=MessageResponse)
@limiter.limit("10/hour")
def join_waitlist(
    request: Request,
    payload: WaitlistRequest,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
) -> MessageResponse:
    try:
        marketing_repository.add_to_waitlist(db, payload.email)
    except SQLAlchemyError:
        logger.exception("Failed to add %s to the waitlist", payload.email)
        raise AppError(500, "Couldn't join the waitlist right now, please try again.")

    # Runs after the response goes out, so a slow email API never adds to
    # how long the user waits for "you're on the list" to show up.
    background_tasks.add_task(email_service.send_waitlist_email, payload.email)

    return MessageResponse(message="You're on the list, we'll be in touch soon.")


@router.post("/demo/book", response_model=MessageResponse)
@limiter.limit("5/hour")
def book_demo(
    request: Request,
    payload: DemoBookingRequest,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
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

    background_tasks.add_task(email_service.send_demo_confirmation_email, payload.email, payload.name)

    return MessageResponse(message="Thanks! Our team will reach out to book your demo.")
