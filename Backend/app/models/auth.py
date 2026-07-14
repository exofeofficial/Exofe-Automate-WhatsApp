# models/auth.py
# Request/response schemas for auth endpoints. Business owner
# signup/login/OTP schemas go here too once those get built.

from pydantic import BaseModel, EmailStr, Field


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    token: str
