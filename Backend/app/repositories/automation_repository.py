# app/repositories/automation_repository.py
import json

from sqlalchemy import text
from sqlalchemy.orm import Session

_COLUMNS = (
    "business_id, template, prompt, body_text, kind, buttons, "
    "list_button_label, list_rows, trigger, status"
)


def _params(business_id: str, data: dict) -> dict:
    return {
        "business_id": business_id,
        "template": data["template"],
        "prompt": data["prompt"],
        "body_text": data["body_text"],
        "kind": data["kind"],
        "buttons": json.dumps(data["buttons"]),
        "list_button_label": data["list_button_label"],
        "list_rows": json.dumps(data["list_rows"]),
        "trigger": data["trigger"],
        "status": data["status"],
    }


def _normalize(row) -> dict:
    d = dict(row._mapping)
    d["id"] = str(d["id"])
    return d


def list_messages(db: Session, business_id: str) -> list[dict]:
    rows = db.execute(
        text(
            "SELECT * FROM interactive_messages WHERE business_id = :business_id "
            "ORDER BY created_at DESC"
        ),
        {"business_id": business_id},
    ).fetchall()
    return [_normalize(row) for row in rows]


def get_message(db: Session, business_id: str, message_id: str) -> dict | None:
    row = db.execute(
        text("SELECT * FROM interactive_messages WHERE id = :id AND business_id = :business_id"),
        {"id": message_id, "business_id": business_id},
    ).fetchone()
    return _normalize(row) if row else None


def create_message(db: Session, business_id: str, data: dict) -> dict:
    # CAST(... AS jsonb) instead of the :param::jsonb shorthand — SQLAlchemy's
    # text() bind-parameter parser doesn't recognize a bind param immediately
    # followed by a `::` cast, so :buttons::jsonb silently stays unbound.
    row = db.execute(
        text(
            f"""
            INSERT INTO interactive_messages
                ({_COLUMNS})
            VALUES
                (:business_id, :template, :prompt, :body_text, :kind, CAST(:buttons AS jsonb),
                 :list_button_label, CAST(:list_rows AS jsonb), :trigger, :status)
            RETURNING *
            """
        ),
        _params(business_id, data),
    ).fetchone()
    db.commit()
    return _normalize(row)


def update_message(db: Session, business_id: str, message_id: str, data: dict) -> dict | None:
    params = _params(business_id, data)
    params["id"] = message_id
    row = db.execute(
        text(
            """
            UPDATE interactive_messages SET
                template = :template, prompt = :prompt, body_text = :body_text,
                kind = :kind, buttons = CAST(:buttons AS jsonb),
                list_button_label = :list_button_label, list_rows = CAST(:list_rows AS jsonb),
                trigger = :trigger, status = :status, updated_at = NOW()
            WHERE id = :id AND business_id = :business_id
            RETURNING *
            """
        ),
        params,
    ).fetchone()
    db.commit()
    return _normalize(row) if row else None


def delete_message(db: Session, business_id: str, message_id: str) -> bool:
    result = db.execute(
        text("DELETE FROM interactive_messages WHERE id = :id AND business_id = :business_id"),
        {"id": message_id, "business_id": business_id},
    )
    db.commit()
    return result.rowcount > 0