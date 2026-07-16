from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.database.session import get_db
from app.models.auth import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    OtpRequestBody,
    OtpVerifyBody,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthError
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]


# ── helpers ──────────────────────────────────────────────────────────────────

def _handle_auth_error(exc: AuthError) -> HTTPException:
    """Convert an AuthError into the JSON shape the frontend expects."""
    detail: dict = {"message": exc.message}
    if exc.errors:
        detail["errors"] = exc.errors
    return HTTPException(status_code=exc.status_code, detail=detail)


# ── POST /auth/signup ────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/hour")
def signup(request: Request, body: SignupRequest, db: DbSession):
    try:
        token = auth_service.signup(
            db,
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            password=body.password,
            country_code=body.country_code,
            phone=body.phone,
            hear_about=body.hear_about,
        )
    except AuthError as exc:
        raise _handle_auth_error(exc)

    return TokenResponse(token=token)


# ── POST /auth/login ─────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: DbSession):
    try:
        token = auth_service.login(db, email=body.email, password=body.password)
    except AuthError as exc:
        raise _handle_auth_error(exc)

    return TokenResponse(token=token)


# ── POST /auth/google ────────────────────────────────────────────────────────

@router.post("/google", response_model=TokenResponse)
@limiter.limit("20/hour")
def google_auth(request: Request, body: GoogleAuthRequest, db: DbSession):
    try:
        token = auth_service.google_login(db, id_token=body.id_token)
    except AuthError as exc:
        raise _handle_auth_error(exc)

    return TokenResponse(token=token)


# ── POST /auth/otp/request ───────────────────────────────────────────────────

@router.post("/otp/request", response_model=MessageResponse)
@limiter.limit("5/hour")
def otp_request(request: Request, body: OtpRequestBody, db: DbSession):
    auth_service.request_otp(db, email=body.email)
    # Always return success — never reveal whether the email exists
    return MessageResponse(message="Code sent")


# ── POST /auth/otp/verify ────────────────────────────────────────────────────

@router.post("/otp/verify", response_model=TokenResponse)
@limiter.limit("20/hour")
def otp_verify(request: Request, body: OtpVerifyBody, db: DbSession):
    try:
        token = auth_service.verify_otp(db, email=body.email, code=body.code)
    except AuthError as exc:
        raise _handle_auth_error(exc)

    return TokenResponse(token=token)


# ── POST /auth/forgot-password ───────────────────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/hour")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: DbSession):
    auth_service.forgot_password(db, email=body.email)
    # Always return success — never reveal whether the email exists
    return MessageResponse(message="If that email exists, a reset link has been sent")


# ── POST /auth/reset-password ────────────────────────────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
@limiter.limit("10/hour")
def reset_password(request: Request, body: ResetPasswordRequest, db: DbSession):
    try:
        auth_service.reset_password(
            db, token=body.token, new_password=body.new_password
        )
    except AuthError as exc:
        raise _handle_auth_error(exc)

    return MessageResponse(message="Password has been reset")


# ── POST /auth/verify-email ──────────────────────────────────────────────────

@router.post("/verify-email", response_model=MessageResponse)
@limiter.limit("10/hour")
def verify_email(request: Request, body: VerifyEmailRequest, db: DbSession):
    try:
        auth_service.verify_email(db, email=body.email, code=body.code)
    except AuthError as exc:
        raise _handle_auth_error(exc)

    return MessageResponse(message="Email verified")


# ── POST /auth/logout ────────────────────────────────────────────────────────
# JWT is stateless — logout is handled client-side by discarding the token.
# This endpoint exists so the frontend has something to call if needed.

@router.post("/logout", response_model=MessageResponse)
def logout():
    return MessageResponse(message="Logged out")