# app/services/conversation_service.py
import base64

from sqlalchemy.orm import Session

from app.ai import classify_intent, extract_order_update
from app.ai import whatsapp_client
from app.core.logger import get_logger
from app.repositories import (
    ai_repository,
    customer_repository,
    draft_order_repository,
    order_repository,
    product_repository,
    user_repository,
)
from app.services import ai_service, ai_usage_service, shopify_service

logger = get_logger(__name__)

# Sentinel: "this wasn't a browsing action, fall through to normal intent
# handling" — distinct from a real `None` return, which means a reply
# (interactive message) was already sent and nothing more is needed.
_FALLTHROUGH = object()

def _active_catalog(db: Session, business_id: str) -> list[dict]:
    """Every active product, with full variant/stock detail. Deliberately
    NOT filtered to only in-stock items — the AI needs the real stock
    numbers to recognize when a customer picks something that's sold
    out, not just fail to recognize it at all."""
    products = product_repository.get_all_products(db, business_id, status="active")
    catalog = []
    for p in products:
        if p["has_variants"]:
            catalog.append(
                {
                    "id": p["id"],
                    "name": p["name"],
                    "has_variants": True,
                    "options": p["options"],
                    "variants": [
                        {
                            "id": v["id"],
                            "option_values": v["option_values"],
                            "price": v["price"],
                            "stock": v["stock"],
                        }
                        for v in p["variants"]
                    ],
                }
            )
        else:
            catalog.append(
                {
                    "id": p["id"],
                    "name": p["name"],
                    "has_variants": False,
                    "price": p["price"],
                    "stock": p["stock"],
                }
            )
    return catalog

_CONFIRMATION_WORDS = {"yes", "y", "yeah", "yep", "confirm", "confirmed", "ok", "okay", "haan", "ji", "ji haan"}


def _is_explicit_confirmation(message: str) -> bool:
    return message.strip().lower().strip(".!?") in _CONFIRMATION_WORDS


def _best_matching_faq(db: Session, business_id: str, message: str) -> dict | None:
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

def _finalize_order(db, business_id, customer_id, draft_id, result, merged_data) -> str:
        payment_method = merged_data.get("payment_method")
        payment_method = payment_method if payment_method in ("cod", "online") else "cod"

        try:
            order = order_repository.create_order(
                db,
                business_id=business_id,
                customer_id=customer_id,
                items=_order_items_from_draft(result, merged_data),
                delivery_address=merged_data.get("delivery_address", ""),
                payment_method=payment_method,
            )
        except ValueError:
            draft_order_repository.mark_status(db, business_id, draft_id, "abandoned")
            return "Sorry, that item just went out of stock — someone from our team will follow up with you shortly."

        draft_order_repository.mark_status(db, business_id, draft_id, "confirmed", order_id=order["id"])
        return result.next_question or f"Your order is confirmed! Total: PKR {order['total']:,.0f}."

def _order_items_from_draft(result, merged_data: dict) -> list[dict]:
    item = {"product_id": result.matched_product_id, "quantity": int(merged_data.get("quantity", 1))}
    if result.matched_variant_id:
        item["variant_id"] = result.matched_variant_id
    return [item]


def _start_new_draft(db: Session, business_id: str, business: dict, customer_id: str, message: str, settings: dict) -> str:
    catalog = _active_catalog(db, business_id)
    result = extract_order_update(
        message=message,
        current_draft={},
        product_catalog=catalog,
        business_prompt=settings["business_prompt"],
        tone=settings["tone"],
        delivery_charge=float(business.get("delivery_charge") or 0),
        payment_details=business.get("payment_details") or "",
    )

    if result.out_of_stock:
        # Nothing to save as a draft yet — just relay what's out of
        # stock and let them try again.
        return result.next_question or "That item is out of stock right now — would you like something else?"

    missing = [] if result.is_complete else ["see next_question"]
    draft = draft_order_repository.create_draft(db, business_id, customer_id, result.updated_fields, missing)

    if result.is_complete and result.confirmed:
        return _finalize_order(db, business_id, customer_id, draft["id"], result, result.updated_fields)

    return result.next_question or "Got it — let's get your order sorted."


def _continue_draft(
    db: Session, business_id: str, business: dict, customer_id: str, message: str, draft: dict, settings: dict
) -> str:
    catalog = _active_catalog(db, business_id)
    result = extract_order_update(
        message=message,
        current_draft=draft["data"],
        product_catalog=catalog,
        business_prompt=settings["business_prompt"],
        tone=settings["tone"],
        delivery_charge=float(business.get("delivery_charge") or 0),
        payment_details=business.get("payment_details") or "",
    )

    merged_data = {**draft["data"], **result.updated_fields}

    if result.out_of_stock:
        # Keep the draft alive (don't lose what we've already collected),
        # just don't advance it — the AI's next_question already asks
        # for an alternative.
        draft_order_repository.update_draft(db, business_id, draft["id"], merged_data, ["see next_question"])
        return result.next_question or "That option is out of stock — want to try a different one?"

    missing = [] if result.is_complete else ["see next_question"]
    draft_order_repository.update_draft(db, business_id, draft["id"], merged_data, missing)

    # The model is sometimes too conservative about setting confirmed=true
    # on a bare "yes" once every field is already filled — leaving a
    # customer stuck replying "yes" to the same summary forever is a real
    # dropped-order risk, so a plain affirmative on an already-complete
    # draft confirms it deterministically instead of relying on the model
    # to notice every time.
    was_already_complete = not draft["missing_fields"]
    confirmed = result.confirmed or (
        was_already_complete and result.is_complete and _is_explicit_confirmation(message)
    )

    if not (result.is_complete and confirmed):
        return result.next_question or "Got it — anything else to add?"

    if not result.confirmed:
        # Came from the deterministic override above — the model's own
        # next_question is still its unconfirmed "please reply YES"
        # phrasing, which would be a confusing thing to show alongside an
        # order that just got placed. Drop it so _finalize_order falls
        # back to its own real, total-based confirmation message.
        result = result.model_copy(update={"next_question": None})

    return _finalize_order(db, business_id, customer_id, draft["id"], result, merged_data)


# ── Catalog browsing + cart ──────────────────────────────────────────────────
# A customer who doesn't already know what they want ("show me the catalog")
# gets a tap-through browse: category list -> products one at a time -> add
# to a cart that survives across categories -> checkout everything at once.
# All of this is deterministic (button/list taps, not Gemini) right up until
# checkout, where cart items are handed straight to order_repository — no
# natural-language matching needed since every item is already a real
# product_id/variant_id/quantity by the time we get there.

def _format_product_message(product: dict) -> str:
    lines = [f"*{product['name']}*", f"Price: PKR {product['price']:,.0f}"]
    if product.get("description"):
        lines.append(product["description"])
    for opt in product.get("options") or []:
        lines.append(f"{opt['name']}: {', '.join(opt['values'])}")
    if product["stock"] <= 0 and not product.get("has_variants"):
        lines.append("_Currently out of stock._")
    return "\n".join(lines)


def _cart_total(cart: list[dict]) -> float:
    return sum(item["price"] * item["quantity"] for item in cart)


def _cart_summary(cart: list[dict]) -> str:
    lines = [f"• {item['name']} x{item['quantity']} — PKR {item['price'] * item['quantity']:,.0f}" for item in cart]
    lines.append(f"\n*Total: PKR {_cart_total(cart):,.0f}*")
    return "\n".join(lines)


def _start_browsing(db: Session, business: dict, customer_id: str, to: str, cart: list[dict] | None = None) -> None:
    cart = cart or []
    categories = product_repository.get_categories(db, business["id"])
    if not categories:
        # No categories configured — skip straight to browsing every
        # active product instead of telling the customer the store looks
        # unfinished. "_all" is a sentinel category_id, not a real row.
        return _show_product_at_index(db, business, customer_id, to, category_id="_all", index=0, cart=cart)

    rows = [{"id": f"category:{c['id']}", "title": c["name"][:24]} for c in categories[:10]]
    whatsapp_client.send_list_message(
        to,
        body="Sure! Which category are you interested in? 😊",
        button_text="Browse",
        rows=rows,
        phone_number_id=business["whatsapp_phone_number_id"],
        access_token=business["whatsapp_access_token"],
    )
    customer_repository.set_browse_state(db, customer_id, {"stage": "awaiting_category", "cart": cart})
    return None


def _get_whatsapp_image_ref(db: Session, business: dict, product_id: str) -> dict | None:
    """Resolves a product's cover photo into whatever shape
    whatsapp_client.send_button_message's header_image expects. Real
    hosted URLs go straight through as a link; images we only have as
    base64 (see product_images.url) get uploaded to Meta once and the
    resulting media id is cached on that image row for next time."""
    image = product_repository.get_first_image(db, product_id)
    if not image:
        return None

    url = image["url"]
    if not url.startswith("data:"):
        return {"link": url}

    if image["whatsapp_media_id"]:
        return {"id": image["whatsapp_media_id"]}

    try:
        header, b64_data = url.split(",", 1)
        mime_type = header.split(";")[0].removeprefix("data:") or "image/jpeg"
        raw = base64.b64decode(b64_data)
    except (ValueError, base64.binascii.Error):
        logger.error(f"Malformed data URI for product image {image['id']}")
        return None

    media_id = whatsapp_client.upload_media(
        business["whatsapp_phone_number_id"], business["whatsapp_access_token"], raw, mime_type
    )
    if not media_id:
        return None

    product_repository.set_image_media_id(db, image["id"], media_id)
    return {"id": media_id}


def _show_product_at_index(
    db: Session, business: dict, customer_id: str, to: str, category_id: str, index: int, cart: list[dict]
) -> None:
    if category_id == "_all":
        products = product_repository.get_all_products(db, business["id"], status="active")
    else:
        categories = {c["id"]: c["name"] for c in product_repository.get_categories(db, business["id"])}
        category_name = categories.get(category_id)
        products = product_repository.get_all_products(db, business["id"], category=category_name, status="active") if category_name else []

    if not products:
        customer_repository.clear_browse_state(db, customer_id)
        whatsapp_client.send_text_message(
            to, "No products in that category right now.",
            phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
        )
        return None

    if index >= len(products):
        buttons = [{"id": "browse_categories", "title": "Other categories"}]
        if cart:
            buttons.append({"id": "checkout", "title": f"Checkout ({len(cart)})"})
        whatsapp_client.send_button_message(
            to,
            body="That's every product in this category! Want to see other categories?",
            buttons=buttons,
            phone_number_id=business["whatsapp_phone_number_id"],
            access_token=business["whatsapp_access_token"],
        )
        customer_repository.set_browse_state(
            db, customer_id, {"stage": "browsing_products", "category_id": category_id, "index": index, "cart": cart}
        )
        return None

    product = products[index]
    buttons = [{"id": f"select:{product['id']}", "title": "Select this one"}]
    if index + 1 < len(products):
        buttons.append({"id": "next", "title": "Next product"})

    whatsapp_client.send_button_message(
        to,
        body=_format_product_message(product),
        buttons=buttons,
        header_image=_get_whatsapp_image_ref(db, business, product["id"]),
        phone_number_id=business["whatsapp_phone_number_id"],
        access_token=business["whatsapp_access_token"],
    )
    customer_repository.set_browse_state(
        db, customer_id, {"stage": "browsing_products", "category_id": category_id, "index": index, "cart": cart}
    )
    return None


def _begin_add_to_cart(db: Session, business: dict, customer_id: str, to: str, product: dict, cart: list[dict]) -> None:
    """Either asks which variant (size/color/etc, via a tappable list) or,
    for a simple product, goes straight to asking quantity."""
    if product.get("has_variants") and product.get("variants"):
        rows = [
            {"id": f"variant:{v['id']}", "title": " / ".join(v["option_values"])[:24]}
            for v in product["variants"]
            if v["stock"] > 0
        ][:10]
        if not rows:
            whatsapp_client.send_text_message(
                to, f"Sorry, *{product['name']}* is out of stock in every option right now.",
                phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
            )
            return None
        whatsapp_client.send_list_message(
            to,
            body=f"Which option for *{product['name']}*?",
            button_text="Choose",
            rows=rows,
            phone_number_id=business["whatsapp_phone_number_id"],
            access_token=business["whatsapp_access_token"],
        )
        customer_repository.set_browse_state(
            db, customer_id, {"stage": "awaiting_variant", "pending_product_id": product["id"], "cart": cart}
        )
        return None

    whatsapp_client.send_text_message(
        to, f"Great! How many *{product['name']}* would you like?",
        phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
    )
    customer_repository.set_browse_state(
        db, customer_id, {"stage": "awaiting_quantity", "pending_product_id": product["id"], "cart": cart}
    )
    return None


def _ask_quantity_for_variant(db, business, customer_id, to, product, variant, cart) -> None:
    whatsapp_client.send_text_message(
        to, f"Great! How many *{product['name']} ({' / '.join(variant['option_values'])})* would you like?",
        phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
    )
    customer_repository.set_browse_state(
        db,
        customer_id,
        {
            "stage": "awaiting_quantity",
            "pending_product_id": product["id"],
            "pending_variant_id": variant["id"],
            "cart": cart,
        },
    )


def _add_to_cart_and_show_menu(db, business, customer_id, to, item: dict, cart: list[dict]) -> None:
    cart = [*cart, item]
    whatsapp_client.send_button_message(
        to,
        body=f"Added to cart ✅\n\n{_cart_summary(cart)}\n\nKeep browsing or check out?",
        buttons=[{"id": "browse_categories", "title": "Keep browsing"}, {"id": "checkout", "title": "Checkout"}],
        phone_number_id=business["whatsapp_phone_number_id"],
        access_token=business["whatsapp_access_token"],
    )
    customer_repository.set_browse_state(db, customer_id, {"stage": "cart_menu", "cart": cart})


def _start_checkout(db, business, customer_id, to, cart: list[dict]) -> None:
    if not cart:
        whatsapp_client.send_text_message(
            to, "Your cart's empty — add something first!",
            phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
        )
        return None
    whatsapp_client.send_text_message(
        to, f"Here's your order so far:\n\n{_cart_summary(cart)}\n\nWhat's the delivery address?",
        phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
    )
    customer_repository.set_browse_state(db, customer_id, {"stage": "awaiting_address", "cart": cart})
    return None


def _finalize_cart_order(db, business_id, business, customer_id, to, cart, delivery_address, payment_method) -> None:
    items = [
        {"product_id": item["product_id"], "variant_id": item.get("variant_id"), "quantity": item["quantity"]}
        for item in cart
    ]
    try:
        order = order_repository.create_order(
            db,
            business_id=business_id,
            customer_id=customer_id,
            items=items,
            delivery_address=delivery_address,
            payment_method=payment_method,
        )
    except ValueError as e:
        customer_repository.clear_browse_state(db, customer_id)
        whatsapp_client.send_text_message(
            to, f"Sorry — {e} Someone from our team will follow up with you shortly.",
            phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
        )
        return None

    customer_repository.clear_browse_state(db, customer_id)
    whatsapp_client.send_text_message(
        to, f"Your order is confirmed! ✅ Total: PKR {order['total']:,.0f}. Thanks for shopping with us!",
        phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
    )
    # Best-effort only (catches its own exceptions) — a connected store
    # gets this order mirrored in, but a Shopify hiccup must never touch
    # the WhatsApp confirmation already sent above.
    shopify_service.push_order_to_shopify(db, business_id, order["id"])
    return None


def _handle_browse_reply(db: Session, business: dict, customer_id: str, to: str, message: str, state: dict, settings: dict):
    """Returns _FALLTHROUGH when `message` isn't one of the taps/answers
    we're waiting for — the caller then clears the stale state and
    processes the message as a normal fresh one instead of silently
    dropping it."""
    cart = state.get("cart") or []
    stage = state.get("stage")

    is_tap = message.startswith(("category:", "select:", "variant:", "pay:")) or message in (
        "next", "browse_categories", "checkout",
    )
    if not is_tap and ("catalog" in message.lower() or "catelog" in message.lower()):
        # A free-typed "show me the catalog again" mid-checkout (e.g. while
        # we're waiting for an address) shouldn't get swallowed as if it
        # were the answer to whatever we just asked — restart browsing,
        # keeping whatever's already in the cart.
        return _start_browsing(db, business, customer_id, to, cart=cart)

    if message.startswith("category:"):
        category_id = message.split(":", 1)[1]
        return _show_product_at_index(db, business, customer_id, to, category_id, index=0, cart=cart)

    if message == "browse_categories":
        return _start_browsing(db, business, customer_id, to, cart=cart)

    if message == "checkout":
        return _start_checkout(db, business, customer_id, to, cart)

    if stage == "browsing_products":
        if message == "next":
            return _show_product_at_index(db, business, customer_id, to, state["category_id"], state["index"] + 1, cart=cart)

        if message.startswith("select:"):
            product_id = message.split(":", 1)[1]
            product = product_repository.get_product_by_id(db, product_id, business["id"])
            if not product:
                customer_repository.clear_browse_state(db, customer_id)
                return "Sorry, that item isn't available anymore — anything else I can help with?"
            return _begin_add_to_cart(db, business, customer_id, to, product, cart)

    if stage == "awaiting_variant" and message.startswith("variant:"):
        variant_id = message.split(":", 1)[1]
        product = product_repository.get_product_by_id(db, state["pending_product_id"], business["id"])
        variant = next((v for v in (product["variants"] if product else []) if v["id"] == variant_id), None)
        if not product or not variant:
            customer_repository.clear_browse_state(db, customer_id)
            return "Sorry, that option isn't available anymore — anything else I can help with?"
        return _ask_quantity_for_variant(db, business, customer_id, to, product, variant, cart)

    if stage == "awaiting_quantity":
        try:
            quantity = int("".join(ch for ch in message if ch.isdigit()) or "0")
        except ValueError:
            quantity = 0
        if quantity <= 0:
            whatsapp_client.send_text_message(
                to, "Just a number please — how many would you like?",
                phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
            )
            return None

        product = product_repository.get_product_by_id(db, state["pending_product_id"], business["id"])
        if not product:
            customer_repository.clear_browse_state(db, customer_id)
            return "Sorry, that item isn't available anymore — anything else I can help with?"

        variant_id = state.get("pending_variant_id")
        if variant_id:
            variant = next((v for v in product["variants"] if v["id"] == variant_id), None)
            if not variant or variant["stock"] < quantity:
                whatsapp_client.send_text_message(
                    to, "Sorry, there isn't enough stock for that — try a smaller quantity?",
                    phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
                )
                return None
            item = {
                "product_id": product["id"], "variant_id": variant_id,
                "name": f"{product['name']} ({' / '.join(variant['option_values'])})",
                "price": variant["price"], "quantity": quantity,
            }
        else:
            if product["stock"] < quantity:
                whatsapp_client.send_text_message(
                    to, "Sorry, there isn't enough stock for that — try a smaller quantity?",
                    phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
                )
                return None
            item = {"product_id": product["id"], "variant_id": None, "name": product["name"], "price": product["price"], "quantity": quantity}

        _add_to_cart_and_show_menu(db, business, customer_id, to, item, cart)
        return None

    if stage == "awaiting_address" and message.strip():
        new_state = {"stage": "awaiting_payment", "cart": cart, "delivery_address": message.strip()}
        customer_repository.set_browse_state(db, customer_id, new_state)
        whatsapp_client.send_button_message(
            to, body="Cash on Delivery or Online Payment?",
            buttons=[{"id": "pay:cod", "title": "Cash on Delivery"}, {"id": "pay:online", "title": "Online Payment"}],
            phone_number_id=business["whatsapp_phone_number_id"], access_token=business["whatsapp_access_token"],
        )
        return None

    if stage == "awaiting_payment" and message in ("pay:cod", "pay:online"):
        payment_method = "cod" if message == "pay:cod" else "online"
        _finalize_cart_order(db, business["id"], business, customer_id, to, cart, state.get("delivery_address", ""), payment_method)
        return None

    customer_repository.clear_browse_state(db, customer_id)
    return _FALLTHROUGH


def handle_inbound_message(db: Session, business_id: str, customer_id: str, message: str) -> str | None:
    """The orchestrator. Returns the reply text to send as a plain message,
    or None when a reply (interactive list/buttons, or nothing at all) was
    already handled inside this call. This is what the webhook calls.

    Returns None when this business has hit its plan's monthly AI
    conversation limit (see ai_usage_service) — no automated reply
    should be sent, a human needs to pick this conversation up.

    Also returns None when a staff member has taken this specific
    conversation over (see app/api/v1/conversations.py) — the AI stays
    silent on it until they hand it back."""
    customer = customer_repository.get_customer(db, business_id, customer_id)
    if customer and customer["conversation_mode"] == "human":
        return None

    if not ai_usage_service.check_and_increment(db, business_id, customer_id):
        return None

    settings = ai_service.get_settings(db, business_id)
    business = user_repository.get_business_by_id(db, business_id)
    draft = draft_order_repository.get_active_draft(db, business_id, customer_id)

    # An explicit ask to (re)browse the catalog should always win, even
    # mid-draft — otherwise a customer who already picked one product is
    # stuck restating quantity/address forever with no way to say "actually,
    # show me the catalog again" (extract_order_update just answers that
    # conversationally without ever actually re-opening the browse flow).
    lower_message = message.strip().lower()
    wants_catalog = any(w in lower_message for w in ("catalog", "catelog")) or message in (
        "next",
        "browse_categories",
    ) or message.startswith("category:") or message.startswith("select:")

    if draft and wants_catalog:
        draft_order_repository.mark_status(db, business_id, draft["id"], "abandoned")
        draft = None

    if draft:
        return _continue_draft(db, business_id, business, customer_id, message, draft, settings)

    browse_state = customer_repository.get_browse_state(db, customer_id)
    if browse_state:
        customer = customer_repository.get_customer(db, business_id, customer_id)
        reply = _handle_browse_reply(db, business, customer_id, customer["whatsapp_number"], message, browse_state, settings)
        if reply is not _FALLTHROUGH:
            return reply
        # not a recognized browse tap (state already cleared inside) — treat
        # this message as brand new below, same as if browsing never started

    intent = classify_intent(message, has_active_draft=False)

    if intent.kind == "greeting":
        return settings["greeting_message"] or "Hi! How can we help you today?"

    if intent.kind == "browse_catalog":
        customer = customer_repository.get_customer(db, business_id, customer_id)
        return _start_browsing(db, business, customer_id, customer["whatsapp_number"])

    if intent.kind == "faq":
        faq = _best_matching_faq(db, business_id, message)
        if faq:
            return faq["answer"]
        intent.kind = "unclear"

    if intent.kind == "order":
        return _start_new_draft(db, business_id, business, customer_id, message, settings)

    if not settings["handover_enabled"]:
        return "Sorry, I didn't quite catch that — could you rephrase?"
    return "Let me get a team member to help you with that."
