# app/ai/order_extraction.py

from pydantic import BaseModel
from app.ai.gemini_client import generate_structured

_DRAFT_FIELDS = ("product", "size", "color", "quantity", "customer_name", "delivery_address", "payment_method")


class OrderExtraction(BaseModel):
    # Explicit optional fields rather than a free-form dict — Gemini's
    # structured-output mode (response_schema) doesn't support
    # dict[str, str] in Developer API mode ("additionalProperties is
    # only supported in Gemini Enterprise Agent Platform mode").
    product: str | None = None
    size: str | None = None
    color: str | None = None
    quantity: str | None = None
    customer_name: str | None = None
    delivery_address: str | None = None
    payment_method: str | None = None
    next_question: str | None = None
    is_complete: bool = False
    matched_product_id: str | None = None
    matched_variant_id: str | None = None   # only set when the matched product has_variants
    out_of_stock: bool = False              # true when the selected product/variant has stock 0
    confirmed: bool = False                 # true only once the customer explicitly confirms the
                                             # order summary — is_complete alone never finalizes it

    @property
    def updated_fields(self) -> dict[str, str]:
        return {f: getattr(self, f) for f in _DRAFT_FIELDS if getattr(self, f) is not None}


def extract_order_update(
    *,
    message: str,
    current_draft: dict,
    product_catalog: list[dict],
    business_prompt: str,
    tone: str,
    delivery_charge: float,
    payment_details: str,
) -> OrderExtraction:
    prompt = f"""
    {business_prompt}
    Respond in a {tone} tone.

    You are helping a customer complete an order. Here is what we know so far:
    {current_draft}

    Available products (ONLY use these — never invent a product, price,
    stock level, size, or color that isn't listed here). Each entry
    includes its real current stock. Some products have variants
    (different size/color combinations), each with its own stock:
    {product_catalog}

    Flat delivery charge for every order: PKR {delivery_charge:.0f}
    Online payment details to read back to a customer who wants to pay
    online: {payment_details or "(not set by the business owner yet — if a customer picks online, apologize and offer Cash on Delivery instead)"}

    Customer's latest message: "{message}"

    Required fields to complete a draft, in order, one question at a
    time — don't ask for two things at once, and don't ask for
    something you already have:
    1. product (and every option it has — e.g. size AND color, if it's
       a product with variants)
    2. quantity
    3. customer_name
    4. delivery_address
    5. payment_method — "online" or "cod". If online, read back the
       payment details above verbatim and ask them to confirm once
       they've sent the payment.
    6. Once payment_method is set, send ONE final summary message
       covering: product (with size/color if any), quantity, unit
       price, subtotal, the delivery charge above, the total (subtotal
       + delivery charge), customer name, delivery address, and
       payment method. Ask the customer to reply to confirm (e.g.
       "Reply YES to confirm this order.").

    Rules:
    1. Fill in product/size/color/quantity/customer_name/delivery_address/
       payment_method with anything new from this message. Never drop a
       field you already had — repeat it back unchanged if this message
       doesn't touch it.
    2. If the customer selects a specific product or variant whose
       stock is 0: set out_of_stock=true, do NOT mark the order
       complete, and set next_question to tell them that specific
       item is out of stock and ask if they'd like a different
       size/color or a different product. Don't guess a replacement
       for them.
    3. matched_variant_id only applies to products with variants —
       leave it null for products without variants, and leave it null
       until every option (size, color, etc.) for that product has
       been specified by the customer.
    4. "is_complete" is true once every field above (1 through 5) is
       filled in. It does NOT mean the order should be placed yet.
    5. "confirmed" is true only when the customer's LATEST message is
       an explicit yes/confirm/ok (in response to the summary in step
       6) — otherwise always false, even if is_complete is true. If
       they ask to change something instead of confirming, update
       that field, set confirmed=false, and send a fresh summary.
    6. When you do set confirmed=true, next_question must be a short
       "your order is confirmed" message (with the total) — never ask
       them to reply YES again once they already have.
    """
    return generate_structured(prompt, OrderExtraction)
