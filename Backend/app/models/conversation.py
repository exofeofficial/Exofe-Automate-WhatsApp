# app/models/conversation.py
# Pydantic request/response schemas for the conversations endpoints.

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ConversationSummary(_CamelModel):
    id: str
    name: str | None
    whatsapp_number: str
    last_message: str | None
    last_message_at: str | None
    last_direction: str | None
    unread_count: int
    mode: str  # "ai" | "human"


class ConversationsListResponse(BaseModel):
    conversations: list[ConversationSummary]


class ConversationMessage(_CamelModel):
    id: str
    from_: str = Field(alias="from")  # "customer" | "ai" | "staff"
    text: str
    time: str


class ConversationDetailResponse(_CamelModel):
    id: str
    name: str | None
    whatsapp_number: str
    mode: str
    messages: list[ConversationMessage]


class ConversationModeResponse(_CamelModel):
    id: str
    mode: str


class SendConversationMessageRequest(_CamelModel):
    text: str = Field(..., min_length=1, max_length=4096)


class SendConversationMessageResponse(BaseModel):
    message: ConversationMessage
