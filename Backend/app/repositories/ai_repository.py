# app/repositories/ai_repository.py

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_ai_settings(db: Session, business_id: str) -> dict | None:
    row = db.execute(
        text("SELECT * FROM ai_settings WHERE business_id = :business_id"),
        {"business_id": business_id},
    ).fetchone()
    return dict(row._mapping) if row else None


def create_default_ai_settings(db: Session, business_id: str) -> dict:
    """No ai_settings row gets created at signup (unlike subscriptions),
    so GET/PATCH /ai/settings both need to get-or-create on first touch."""
    row = db.execute(
        text("INSERT INTO ai_settings (business_id) VALUES (:business_id) RETURNING *"),
        {"business_id": business_id},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def update_ai_settings(
    db: Session,
    business_id: str,
    *,
    business_prompt: str,
    tone: str,
    greeting_message: str,
    handover_enabled: bool,
) -> dict:
    row = db.execute(
        text(
            """
            UPDATE ai_settings SET
                business_prompt = :business_prompt, tone = :tone,
                greeting_message = :greeting_message, handover_enabled = :handover_enabled,
                updated_at = NOW()
            WHERE business_id = :business_id
            RETURNING *
            """
        ),
        {
            "business_id": business_id,
            "business_prompt": business_prompt,
            "tone": tone,
            "greeting_message": greeting_message,
            "handover_enabled": handover_enabled,
        },
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def list_faqs(db: Session, business_id: str) -> list[dict]:
    rows = db.execute(
        text("SELECT * FROM faqs WHERE business_id = :business_id ORDER BY created_at"),
        {"business_id": business_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def create_faq(db: Session, business_id: str, question: str, answer: str) -> dict:
    row = db.execute(
        text(
            "INSERT INTO faqs (business_id, question, answer) "
            "VALUES (:business_id, :question, :answer) RETURNING *"
        ),
        {"business_id": business_id, "question": question, "answer": answer},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def update_faq(db: Session, business_id: str, faq_id: str, question: str, answer: str) -> dict | None:
    row = db.execute(
        text(
            "UPDATE faqs SET question = :question, answer = :answer "
            "WHERE id = :faq_id AND business_id = :business_id RETURNING *"
        ),
        {"faq_id": faq_id, "business_id": business_id, "question": question, "answer": answer},
    ).fetchone()
    db.commit()
    return dict(row._mapping) if row else None


def delete_faq(db: Session, business_id: str, faq_id: str) -> bool:
    result = db.execute(
        text("DELETE FROM faqs WHERE id = :faq_id AND business_id = :business_id"),
        {"faq_id": faq_id, "business_id": business_id},
    )
    db.commit()
    return result.rowcount > 0