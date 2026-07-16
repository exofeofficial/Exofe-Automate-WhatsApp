# app/services/conversation_service.py

from sqlalchemy.orm import Session

from app.ai import classify_intent, extract_order_update
from app.repositories import ai_repository, draft_order_repository, order_repository, product_repository
from app.services import ai_service


def _active_catalog(db: Session, business_id: str) -> list[dict]:
    """Only active, in-stock products — never let the AI see (and
    potentially offer) something that isn't actually sellable right now."""
    products = product_repository.get_all_products(db, business_id, status="active")
    return [
        {"id": p["id"], "name": p["name"], "price": p["price"]}
        for p in products
        if p["stock"] > 0
    ]


def _best_matching_faq(db: Session, business_id: str, message: str) -> dict | None:
    """Plain keyword overlap, not a Gemini call — AI.md is explicit that
    FAQ answers should be used as-written, not rephrased, so this is a
    retrieval problem, not a generation one. Good enough for a short FAQ
    list; swap for real search if the list ever gets long."""
    faqs = ai_repository.list_faqs(db, business_id)
    if not faqs:
        return None

    message_words = set(message.lower().split())
    best, best_score = None, 0
    for faq in faqs:
        question_words = set(faq["question"].lower().split())
        score = len(message_words & question_words)
        if score > best_score:
            best, best_score = faq, score

    return best if best_score > 0 else None


def _start_new_draft(db: Session, business_id: str, customer_id: str, message: str, settings: dict) -> str:
    catalog = _active_catalog(db, business_id)
    result = extract_order_update(
        message=message,
        current_draft={},
        product_catalog=catalog,
        business_prompt=settings["business_prompt"],
        tone=settings["tone"],
    )

    missing = [] if result.is_complete else ["see next_question"]
    draft_order_repository.create_draft(db, business_id, customer_id, result.updated_fields, missing)
    return result.next_question or "Got it — let's get your order sorted."


def _continue_draft(db: Session, business_id: str, customer_id: str, message: str, draft: dict, settings: dict) -> str:
    catalog = _active_catalog(db, business_id)
    result = extract_order_update(
        message=message,
        current_draft=draft["data"],
        product_catalog=catalog,
        business_prompt=settings["business_prompt"],
        tone=settings["tone"],
    )

    merged_data = {**draft["data"], **result.updated_fields}
    missing = [] if result.is_complete else ["see next_question"]
    draft_order_repository.update_draft(db, business_id, draft["id"], merged_data, missing)

    if not result.is_complete:
        return result.next_question

    # Phase 6 — finalize into a real order.
    try:
        order = order_repository.create_order(
            db,
            business_id=business_id,
            customer_id=customer_id,
            items=[{"product_id": result.matched_product_id, "quantity": int(merged_data.get("quantity", 1))}],
            delivery_address=merged_data.get("delivery_address", ""),
        )
    except ValueError:
        # Product went out of stock / was removed mid-conversation —
        # don't silently lose the draft, hand it to a human instead of
        # crashing the webhook (AI.md's rule: never let AI failure be
        # invisible to the business owner).
        draft_order_repository.mark_status(db, business_id, draft["id"], "abandoned")
        return "Sorry, that item just went out of stock — someone from our team will follow up with you shortly."

    draft_order_repository.mark_status(db, business_id, draft["id"], "completed", order_id=order["id"])
    return (
        f"Your order is ready — {result.next_question or ''}"
        f" Total: PKR {order['total']:,.0f}. Reply CONFIRM to place it."
    ).strip()


def handle_inbound_message(db: Session, business_id: str, customer_id: str, message: str) -> str:
    """The orchestrator. Returns the reply text (or, once Phase 8's
    button-sending exists, this becomes the trigger for an interactive
    message instead of plain text). This is what the webhook calls."""
    settings = ai_service.get_settings(db, business_id)
    draft = draft_order_repository.get_active_draft(db, business_id, customer_id)

    if draft:
        return _continue_draft(db, business_id, customer_id, message, draft, settings)

    intent = classify_intent(message, has_active_draft=False)

    if intent.kind == "greeting":
        return settings["greeting_message"] or "Hi! How can we help you today?"

    if intent.kind == "faq":
        faq = _best_matching_faq(db, business_id, message)
        if faq:
            return faq["answer"]
        # No good match — fall through to unclear/handover rather than
        # guessing at an answer we don't actually have.
        intent.kind = "unclear"

    if intent.kind == "order":
        return _start_new_draft(db, business_id, customer_id, message, settings)

    # unclear
    if not settings["handover_enabled"]:
        return "Sorry, I didn't quite catch that — could you rephrase?"
    return "Let me get a team member to help you with that."