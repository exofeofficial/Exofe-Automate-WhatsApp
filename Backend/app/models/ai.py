# app/models/ai.py

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AISettings(_CamelModel):
    business_prompt: str = ""
    tone: Literal["friendly", "formal", "brief"] = "friendly"
    greeting_message: str = ""
    handover_enabled: bool = True


class AISettingsWrapper(BaseModel):
    settings: AISettings


class FAQRequest(_CamelModel):
    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1, max_length=2000)


class FAQ(_CamelModel):
    id: str
    question: str
    answer: str


class FAQsResponse(BaseModel):
    faqs: list[FAQ]


class FAQResponse(BaseModel):
    faq: FAQ


class MessageResponse(BaseModel):
    message: str


class AIUsage(_CamelModel):
    month_count: int
    month_limit: int | None = None  # None = unlimited (Business plan)
    blocked: bool
    blocked_until: str | None = None


class AIUsageResponse(BaseModel):
    usage: AIUsage