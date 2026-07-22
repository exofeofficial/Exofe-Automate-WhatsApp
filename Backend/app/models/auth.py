import re
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


# ── Shared config ────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)


class _CamelModel(BaseModel):
    """Base model that accepts camelCase JSON and exposes snake_case attrs."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,     # accept both snake_case and camelCase
    )


def _validate_email(v: str) -> str:
    v = v.strip().lower()
    if not _EMAIL_RE.match(v):
        raise ValueError("Invalid email address")
    return v


# ── Requests ─────────────────────────────────────────────────────────────────

class SignupRequest(_CamelModel):
    first_name: str = Field(..., min_length=1, max_length=150)
    last_name: str = Field(..., min_length=1, max_length=150)
    email: str
    password: str = Field(..., min_length=8, max_length=128)
    country_code: str = Field(..., pattern=r"^(PK|KR|AE)$")
    phone: str = Field(..., min_length=4, max_length=20)
    hear_about: str = Field(..., max_length=255)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class LoginRequest(_CamelModel):
    email: str
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class AdminLoginRequest(_CamelModel):
    email: str
    password: str = Field(..., min_length=1)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class OtpRequestBody(_CamelModel):
    email: str

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class OtpVerifyBody(_CamelModel):
    email: str
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class ForgotPasswordRequest(_CamelModel):
    email: str

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class ResetPasswordRequest(_CamelModel):
    email: str
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class VerifyEmailRequest(_CamelModel):
    email: str
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        return _validate_email(v)


class GoogleAuthRequest(_CamelModel):
    # The ID token Google Identity Services hands the frontend after
    # sign-in — verified server-side against Google's public keys, never
    # trusted as-is.
    id_token: str = Field(..., min_length=1)


class AcceptInviteRequest(_CamelModel):
    token: str = Field(..., min_length=1)
    first_name: str = Field(..., min_length=1, max_length=150)
    last_name: str = Field(..., min_length=1, max_length=150)
    password: str = Field(..., min_length=8, max_length=128)


# ── Responses ────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    token: str


class InviteDetailsResponse(_CamelModel):
    business_name: str
    email: str
    role: str


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    """422 validation-error shape the frontend expects."""

    message: str
    errors: dict[str, str] | None = None
