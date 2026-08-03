# app/repositories/template_repository.py
# Plain SQL for whatsapp_templates — one row per business per activated
# starter template (see app/services/template_service.py for the static
# STARTER_TEMPLATES content these rows are built from).

from sqlalchemy import text
from sqlalchemy.orm import Session


def list_templates(db: Session, business_id: str) -> list[dict]:
    rows = db.execute(
        text("SELECT * FROM whatsapp_templates WHERE business_id = :business_id"),
        {"business_id": business_id},
    ).fetchall()
    return [dict(row._mapping) for row in rows]


def get_template_by_key(db: Session, business_id: str, key: str) -> dict | None:
    row = db.execute(
        text("SELECT * FROM whatsapp_templates WHERE business_id = :business_id AND key = :key"),
        {"business_id": business_id, "key": key},
    ).fetchone()
    return dict(row._mapping) if row else None


def create_template(
    db: Session,
    *,
    business_id: str,
    key: str,
    template_name: str,
    category: str,
    language: str,
    body_text: str,
    variables: list[str],
    meta_template_id: str | None,
) -> dict:
    row = db.execute(
        text(
            """
            INSERT INTO whatsapp_templates
                (business_id, key, template_name, category, language, body_text, variables, meta_template_id, status)
            VALUES
                (:business_id, :key, :template_name, :category, :language, :body_text, :variables, :meta_template_id, 'pending')
            RETURNING *
            """
        ),
        {
            "business_id": business_id,
            "key": key,
            "template_name": template_name,
            "category": category,
            "language": language,
            "body_text": body_text,
            "variables": variables,
            "meta_template_id": meta_template_id,
        },
    ).fetchone()
    db.commit()
    return dict(row._mapping)


def update_status_by_name(
    db: Session, business_id: str, template_name: str, status: str, rejection_reason: str | None = None
) -> dict | None:
    """Called from the message_template_status_update webhook once Meta
    finishes reviewing a specific business's submission."""
    row = db.execute(
        text(
            """
            UPDATE whatsapp_templates
            SET status = :status, rejection_reason = :rejection_reason, updated_at = NOW()
            WHERE business_id = :business_id AND template_name = :template_name
            RETURNING *
            """
        ),
        {
            "business_id": business_id,
            "template_name": template_name,
            "status": status,
            "rejection_reason": rejection_reason,
        },
    ).fetchone()
    db.commit()
    return dict(row._mapping) if row else None
