# app/models/automation.py

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

InteractiveMessageTemplate = Literal[
    "order_confirmation", "payment_reminder", "delivery_update", "welcome_message", "custom"
]
InteractiveMessageTrigger = Literal["after_order_created", "after_payment", "after_shipping", "manual"]
InteractiveMessageKind = Literal["buttons", "list"]

# Real WhatsApp Cloud API limits (Step3Preview.tsx enforces the same
# MAX_BUTTONS/MAX_LIST_ROWS client-side) — this is what these messages
# actually have to fit inside once WhatsApp sending exists.
MAX_BUTTONS = 3
MAX_LIST_ROWS = 10


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class InteractiveButton(_CamelModel):
    id: str
    text: str = Field(..., min_length=1, max_length=20)  # WhatsApp button-text limit


class InteractiveListRow(_CamelModel):
    id: str
    title: str = Field(..., min_length=1, max_length=24)  # WhatsApp row-title limit


class InteractiveMessageInput(_CamelModel):
    template: InteractiveMessageTemplate
    prompt: str = Field(default="", max_length=1000)
    body_text: str = Field(default="", max_length=1024)  # WhatsApp interactive body limit
    kind: InteractiveMessageKind
    buttons: list[InteractiveButton] = Field(default_factory=list, max_length=MAX_BUTTONS)
    list_button_label: str = Field(default="", max_length=20)
    list_rows: list[InteractiveListRow] = Field(default_factory=list, max_length=MAX_LIST_ROWS)
    trigger: InteractiveMessageTrigger
    status: Literal["active", "draft"] = "draft"

    @model_validator(mode="after")
    def check_kind_matches_content(self) -> "InteractiveMessageInput":
        if self.kind == "buttons" and not self.buttons:
            raise ValueError("Add at least one button")
        if self.kind == "list" and not self.list_rows:
            raise ValueError("Add at least one list option")
        return self


class InteractiveMessage(InteractiveMessageInput):
    id: str
    created_at: datetime


class InteractiveMessagesResponse(BaseModel):
    messages: list[InteractiveMessage]


class InteractiveMessageResponse(BaseModel):
    message: InteractiveMessage


class MessageResponse(BaseModel):
    message: str