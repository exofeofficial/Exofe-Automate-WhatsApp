from app.repositories import draft_order_repository
from app.ai import classify_intent, extract_order_update


def handle_inbound_message(db, business_id: str, customer_id: str, message: str) -> str:
    """The orchestrator. Returns the reply text (or triggers an interactive
    message — see Phase 8). This is what the webhook calls, once it exists."""
    draft = draft_order_repository.get_active_draft(db, customer_id)

    if not draft:
        intent = classify_intent(message, has_active_draft=False)
        # route: greeting -> ai_settings.greeting_message
        #        faq -> search faqs, answer directly (see Phase 4.5 below)
        #        order -> create a new draft, call extract_order_update
        #        unclear -> handover (see AI.md's rules on this)
    else:
        # has_active_draft=True path — almost always continues the order flow
        result = extract_order_update(message=message, current_draft=draft["data"])
        draft_order_repository.update_draft(db, draft["id"])
        if result.is_complete:
            # Phase 6 — finalize into a real order
            draft_order_repository.mark_status(
                db, draft["id"], "complete", order_id=None
            )
        return result.next_question

    # ... (logic for no-draft paths follows below, but for now just sketch
    # the structure; we'll fill it in in the next step)...
    return "Please tell us what you’d like to order — products, sizes, colors, quantity, etc."