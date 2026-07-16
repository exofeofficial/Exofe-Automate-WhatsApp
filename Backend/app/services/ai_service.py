# app/services/ai_service.py

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.repositories import ai_repository


def _format_settings(row: dict) -> dict:
    return {
        "business_prompt": row["business_prompt"] or "",
        "tone": row["tone"],
        "greeting_message": row["greeting_message"] or "",
        "handover_enabled": row["handover_enabled"],
    }


def get_settings(db: Session, business_id: str) -> dict:
    row = ai_repository.get_ai_settings(db, business_id)
    if not row:
        row = ai_repository.create_default_ai_settings(db, business_id)
    return _format_settings(row)


def update_settings(
    db: Session, business_id: str, *, business_prompt: str, tone: str, greeting_message: str, handover_enabled: bool
) -> dict:
    if not ai_repository.get_ai_settings(db, business_id):
        ai_repository.create_default_ai_settings(db, business_id)

    updated = ai_repository.update_ai_settings(
        db,
        business_id,
        business_prompt=business_prompt,
        tone=tone,
        greeting_message=greeting_message,
        handover_enabled=handover_enabled,
    )
    return _format_settings(updated)


def _to_faq(row: dict) -> dict:
    return {"id": str(row["id"]), "question": row["question"], "answer": row["answer"]}


def list_faqs(db: Session, business_id: str) -> list[dict]:
    return [_to_faq(r) for r in ai_repository.list_faqs(db, business_id)]


def create_faq(db: Session, business_id: str, question: str, answer: str) -> dict:
    return _to_faq(ai_repository.create_faq(db, business_id, question, answer))


def update_faq(db: Session, business_id: str, faq_id: str, question: str, answer: str) -> dict:
    updated = ai_repository.update_faq(db, business_id, faq_id, question, answer)
    if not updated:
        raise AppError(404, "FAQ not found")
    return _to_faq(updated)


def delete_faq(db: Session, business_id: str, faq_id: str) -> None:
    deleted = ai_repository.delete_faq(db, business_id, faq_id)
    if not deleted:
        raise AppError(404, "FAQ not found")