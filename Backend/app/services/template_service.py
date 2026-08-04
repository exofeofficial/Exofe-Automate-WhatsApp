# app/services/template_service.py
# 10 ready-made WhatsApp Business Message Templates, usable by any
# business regardless of industry (order lifecycle + basic engagement).
# "Activating" one submits THAT business's own copy to Meta under their
# own connected WABA — templates aren't shared across WABAs, so every
# business needs its own approved copy (see whatsapp_templates table).

from app.ai import whatsapp_client
from app.core.exceptions import AppError
from app.repositories import notification_repository, template_repository, user_repository

STARTER_TEMPLATES: dict[str, dict] = {
    "order_confirmed": {
        "label": "Order Confirmed",
        "hint": "Sent the moment an order is placed — confirms items and total.",
        "category": "UTILITY",
        "body": "Thanks {{1}}! Your order #{{2}} is confirmed. Total: PKR {{3}}. We'll let you know as soon as it ships.",
        "variables": ["customer_name", "order_id", "total"],
        "examples": ["Ali", "1023", "2,500"],
    },
    "order_shipped": {
        "label": "Order Shipped",
        "hint": "Lets the customer know their order is on its way.",
        "category": "UTILITY",
        "body": "Good news {{1}}! Your order #{{2}} has shipped. Expected delivery: {{3}}.",
        "variables": ["customer_name", "order_id", "eta"],
        "examples": ["Ali", "1023", "2-3 days"],
    },
    "out_for_delivery": {
        "label": "Out for Delivery",
        "hint": "Same-day heads-up so someone's home to receive it.",
        "category": "UTILITY",
        "body": "Your order #{{1}} is out for delivery today! Please make sure someone's home to receive it.",
        "variables": ["order_id"],
        "examples": ["1023"],
    },
    "order_delivered": {
        "label": "Order Delivered",
        "hint": "Confirms a successful delivery.",
        "category": "UTILITY",
        "body": "Your order #{{1}} has been delivered. Thanks for shopping with us!",
        "variables": ["order_id"],
        "examples": ["1023"],
    },
    "order_cancelled": {
        "label": "Order Cancelled",
        "hint": "Explains why an order didn't go through.",
        "category": "UTILITY",
        "body": "Your order #{{1}} has been cancelled. Reason: {{2}}. Reply here if you have any questions.",
        "variables": ["order_id", "reason"],
        "examples": ["1023", "Item out of stock"],
    },
    "cod_confirmation": {
        "label": "COD Confirmation",
        "hint": "Cuts down Cash-on-Delivery no-shows by confirming before dispatch.",
        "category": "UTILITY",
        "body": "Hi {{1}}, please reply YES to confirm your Cash on Delivery order #{{2}} (PKR {{3}}).",
        "variables": ["customer_name", "order_id", "total"],
        "examples": ["Ali", "1023", "2,500"],
    },
    "payment_reminder": {
        "label": "Payment Reminder",
        "hint": "Nudges a customer who hasn't finished paying online yet.",
        "category": "UTILITY",
        "body": "Hi {{1}}, payment for order #{{2}} (PKR {{3}}) is still pending. Complete it here: {{4}}",
        "variables": ["customer_name", "order_id", "total", "link"],
        "examples": ["Ali", "1023", "2,500", "pay.exofe.com/xyz"],
    },
    "welcome_message": {
        "label": "Welcome Message",
        "hint": "First contact with a new customer (e.g. from a click-to-WhatsApp ad).",
        "category": "MARKETING",
        "body": "Welcome to {{1}}! 👋 Reply 'catalog' anytime to browse our products.",
        "variables": ["business_name"],
        "examples": ["Ali's Store"],
    },
    "abandoned_cart": {
        "label": "Abandoned Cart Reminder",
        "hint": "Recovers a cart a customer never checked out.",
        "category": "MARKETING",
        "body": "Hi {{1}}, you left {{2}} item(s) in your cart! Complete your order here: {{3}}",
        "variables": ["customer_name", "item_count", "link"],
        "examples": ["Ali", "2", "exofe.com/cart/xyz"],
    },
    "review_request": {
        "label": "Review Request",
        "hint": "Asks for feedback after a delivered order.",
        "category": "MARKETING",
        "body": "Hi {{1}}, hope you loved order #{{2}}! Got a second to leave us a rating? {{3}}",
        "variables": ["customer_name", "order_id", "link"],
        "examples": ["Ali", "1023", "exofe.com/review/xyz"],
    },
}

DEFAULT_LANGUAGE = "en"


def list_starter_templates(db, business_id: str) -> list[dict]:
    """Every starter template's static content, annotated with this
    business's own activation status (None if never activated)."""
    activated = {row["key"]: row for row in template_repository.list_templates(db, business_id)}

    result = []
    for key, meta in STARTER_TEMPLATES.items():
        row = activated.get(key)
        result.append({
            "key": key,
            "label": meta["label"],
            "hint": meta["hint"],
            "category": meta["category"],
            "body": meta["body"],
            "variables": meta["variables"],
            "status": row["status"] if row else None,
            "rejection_reason": row["rejection_reason"] if row else None,
        })
    return result


def activate_template(db, business_id: str, key: str) -> dict:
    if key not in STARTER_TEMPLATES:
        raise AppError(404, "Unknown template")

    existing = template_repository.get_template_by_key(db, business_id, key)
    if existing:
        raise AppError(400, f"Already {existing['status']} — disconnect isn't supported yet, contact support to redo it.")

    business = user_repository.get_business_by_id(db, business_id)
    if not business["whatsapp_waba_id"] or not business["whatsapp_access_token"]:
        raise AppError(400, "Connect WhatsApp first")

    meta = STARTER_TEMPLATES[key]
    response = whatsapp_client.create_message_template(
        business["whatsapp_waba_id"],
        business["whatsapp_access_token"],
        name=key,
        category=meta["category"],
        language=DEFAULT_LANGUAGE,
        body_text=meta["body"],
        variable_examples=meta["examples"],
    )

    return template_repository.create_template(
        db,
        business_id=business_id,
        key=key,
        template_name=key,
        category=meta["category"],
        language=DEFAULT_LANGUAGE,
        body_text=meta["body"],
        variables=meta["variables"],
        meta_template_id=response.get("id"),
    )


def sync_status_from_webhook(db, waba_id: str, template_name: str, status: str, rejection_reason: str | None) -> None:
    """Called from the whatsapp webhook's message_template_status_update
    handler once Meta finishes reviewing a submission."""
    business = user_repository.get_business_by_waba_id(db, waba_id)
    if not business:
        return
    updated = template_repository.update_status_by_name(db, business["id"], template_name, status, rejection_reason)
    if not updated:
        return

    label = STARTER_TEMPLATES.get(template_name, {}).get("label", template_name)
    if status == "approved":
        notification_repository.create_notification(
            db,
            business_id=business["id"],
            title="Template approved",
            body=f"Your \"{label}\" template was approved by Meta and is ready to use.",
        )
    elif status == "rejected":
        notification_repository.create_notification(
            db,
            business_id=business["id"],
            title="Template rejected",
            body=f"Your \"{label}\" template was rejected by Meta" + (f": {rejection_reason}" if rejection_reason else "."),
        )
