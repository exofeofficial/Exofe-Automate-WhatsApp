# app/api/v1/conversations.py
# Dashboard-facing conversation inbox: list conversations, read message
# history, take a conversation over from the AI (or hand it back), and
# send messages as staff — which go out live over the WhatsApp Cloud API.

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai.whatsapp_client import send_text_message
from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import AppError
from app.database.session import get_db
from app.models.conversation import (
    ConversationDetailResponse,
    ConversationMessage,
    ConversationModeResponse,
    ConversationsListResponse,
    ConversationSummary,
    SendConversationMessageRequest,
    SendConversationMessageResponse,
)
from app.repositories import customer_repository, message_repository, user_repository

router = APIRouter(prefix="/conversations", tags=["conversations"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentOwner = Annotated[CurrentUser, Depends(get_current_user)]


def _require_business(current: CurrentUser) -> str:
    if not current.business_id:
        raise AppError(400, "No business on this account")
    return current.business_id


def _message_from(direction: str, ai_generated: bool) -> str:
    if direction == "inbound":
        return "customer"
    return "ai" if ai_generated else "staff"


@router.get("", response_model=ConversationsListResponse)
def list_conversations(db: DbSession, current: CurrentOwner) -> ConversationsListResponse:
    business_id = _require_business(current)
    rows = message_repository.list_conversations(db, business_id)
    return ConversationsListResponse(
        conversations=[
            ConversationSummary(
                id=str(r["id"]),
                name=r["name"],
                whatsapp_number=r["whatsapp_number"],
                last_message=r["last_message"],
                last_message_at=r["last_message_at"].isoformat() if r["last_message_at"] else None,
                last_direction=r["last_direction"],
                unread_count=r["unread_count"],
                mode=r["mode"],
            )
            for r in rows
        ]
    )


@router.get("/{customer_id}", response_model=ConversationDetailResponse)
def get_conversation(customer_id: str, db: DbSession, current: CurrentOwner) -> ConversationDetailResponse:
    business_id = _require_business(current)
    customer = customer_repository.get_customer(db, business_id, customer_id)
    if not customer:
        raise AppError(404, "Conversation not found")

    messages = message_repository.get_messages_for_customer(db, business_id, customer_id)
    return ConversationDetailResponse(
        id=str(customer["id"]),
        name=customer["name"],
        whatsapp_number=customer["whatsapp_number"],
        mode=customer["conversation_mode"],
        messages=[
            ConversationMessage(
                id=str(m["id"]),
                **{"from": _message_from(m["direction"], m["ai_generated"])},
                text=m["content"] or "",
                time=m["created_at"].isoformat(),
            )
            for m in messages
        ],
    )


@router.post("/{customer_id}/takeover", response_model=ConversationModeResponse)
def takeover_conversation(customer_id: str, db: DbSession, current: CurrentOwner) -> ConversationModeResponse:
    business_id = _require_business(current)
    result = customer_repository.set_conversation_mode(db, business_id, customer_id, "human")
    if not result:
        raise AppError(404, "Conversation not found")
    return ConversationModeResponse(id=str(result["id"]), mode=result["mode"])


@router.post("/{customer_id}/handback", response_model=ConversationModeResponse)
def handback_conversation(customer_id: str, db: DbSession, current: CurrentOwner) -> ConversationModeResponse:
    business_id = _require_business(current)
    result = customer_repository.set_conversation_mode(db, business_id, customer_id, "ai")
    if not result:
        raise AppError(404, "Conversation not found")
    return ConversationModeResponse(id=str(result["id"]), mode=result["mode"])


@router.post("/{customer_id}/messages", response_model=SendConversationMessageResponse)
def send_conversation_message(
    customer_id: str, body: SendConversationMessageRequest, db: DbSession, current: CurrentOwner
) -> SendConversationMessageResponse:
    business_id = _require_business(current)
    customer = customer_repository.get_customer(db, business_id, customer_id)
    if not customer:
        raise AppError(404, "Conversation not found")

    business = user_repository.get_business_by_id(db, business_id)
    if not business or not business["whatsapp_phone_number_id"] or not business["whatsapp_access_token"]:
        raise AppError(400, "WhatsApp is not connected for this business")

    send_text_message(
        customer["whatsapp_number"],
        body.text,
        phone_number_id=business["whatsapp_phone_number_id"],
        access_token=business["whatsapp_access_token"],
    )
    logged = message_repository.log_message(
        db,
        business_id=business_id,
        customer_id=customer_id,
        direction="outbound",
        content=body.text,
        ai_generated=False,
    )

    return SendConversationMessageResponse(
        message=ConversationMessage(
            id=str(logged["id"]),
            **{"from": "staff"},
            text=logged["content"] or "",
            time=logged["created_at"].isoformat(),
        )
    )
