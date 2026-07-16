from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ── Business Profile ─────────────────────────────────────────────────────────

CATEGORIES = (
    "Fashion and Apparel", "Food and Beverage", "Electronics",
    "Beauty and Cosmetics", "Home and Living", "Grocery", "Services", "Other",
)


class BusinessProfile(_CamelModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    category: str = ""
    description: str = ""
    support_email: str = ""
    support_phone: str = ""
    logo: str | None = None

    @field_validator("category")
    @classmethod
    def check_category(cls, v: str) -> str:
        # "" is allowed (industry is nullable) — anything else has to
        # match the businesses.industry CHECK constraint exactly, or the
        # UPDATE fails with a raw constraint-violation 500 instead of a
        # clean validation error.
        if v and v not in CATEGORIES:
            raise ValueError(f"category must be one of {', '.join(CATEGORIES)}")
        return v


class BusinessProfileWrapper(BaseModel):
    profile: BusinessProfile


# ── Business Hours ───────────────────────────────────────────────────────────

DAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


class BusinessHourRow(_CamelModel):
    day: str = Field(..., pattern=r"^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$")
    open: str = "09:00"
    close: str = "18:00"
    closed: bool = False


class HoursUpdateRequest(_CamelModel):
    hours: list[BusinessHourRow]


class HoursWrapper(BaseModel):
    hours: list[BusinessHourRow]


# ── Delivery ─────────────────────────────────────────────────────────────────

class DeliverySettings(_CamelModel):
    areas: str = ""
    charge: float = 0
    estimated_time: str = ""
    cash_on_delivery: bool = True
    pickup_available: bool = False


class DeliveryWrapper(BaseModel):
    delivery: DeliverySettings


# ── Tax ──────────────────────────────────────────────────────────────────────

class TaxSettings(_CamelModel):
    tax_name: str = ""
    tax_rate: float = 0
    prices_include_tax: bool = False


class TaxWrapper(BaseModel):
    tax: TaxSettings


# ── Payment ──────────────────────────────────────────────────────────────────

class PaymentSettings(_CamelModel):
    # Free text on purpose — no payment gateway is wired up yet, so this
    # is just what the AI reads back verbatim to a customer who wants to
    # pay online (e.g. "JazzCash: 0300-1234567 — Ali's Store").
    online_payment_details: str = Field("", max_length=500)


class PaymentWrapper(BaseModel):
    payment: PaymentSettings


# ── Language ─────────────────────────────────────────────────────────────────

class LanguageUpdateRequest(_CamelModel):
    language: str = Field(..., pattern=r"^(en|ur|ko|ar)$")


class LanguageWrapper(BaseModel):
    language: str


# ── GET /settings ────────────────────────────────────────────────────────────

class SettingsResponse(_CamelModel):
    profile: BusinessProfile
    hours: list[BusinessHourRow]
    delivery: DeliverySettings
    tax: TaxSettings
    payment: PaymentSettings
    language: str = "en"


class SettingsWrapper(BaseModel):
    settings: SettingsResponse