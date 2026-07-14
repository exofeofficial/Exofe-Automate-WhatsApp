# models/marketing.py
# Pydantic request/response schemas for the waitlist and demo booking
# endpoints. Field names on DemoBookingRequest use camelCase aliases
# because that's what the frontend actually sends (see DemoBookingPayload
# in frontend/src/lib/api.ts) — populate_by_name lets the code use
# snake_case internally while still accepting the camelCase JSON body.

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

CountryCode = Literal["PK", "KR", "AE"]


class MessageResponse(BaseModel):
    message: str


class WaitlistRequest(BaseModel):
    email: EmailStr


class DemoBookingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    billing_country: str = Field(min_length=1, max_length=100, alias="billingCountry")
    country_code: CountryCode = Field(alias="countryCode")
    phone: str = Field(min_length=1, max_length=20)
    team: str = Field(min_length=1, max_length=100)

    @field_validator("name", "billing_country", "team", mode="after")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field can't be empty")
        return value

    @field_validator("phone", mode="after")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if not (6 <= len(digits) <= 15):
            raise ValueError("Enter a valid phone number")
        return value.strip()
