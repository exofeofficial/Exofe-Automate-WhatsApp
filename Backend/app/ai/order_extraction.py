# app/ai/order_extraction.py

from pydantic import BaseModel
from app.ai.gemini_client import generate_structured

class OrderExtraction(BaseModel):
    updated_fields: dict[str, str]
    next_question: str | None
    is_complete: bool
    matched_product_id: str | None
    matched_variant_id: str | None   # only set when the matched product has_variants
    out_of_stock: bool = False       # true when the selected product/variant has stock 0

def extract_order_update(
    *,
    message: str,
    current_draft: dict,
    product_catalog: list[dict],
    business_prompt: str,
    tone: str,
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

    Customer's latest message: "{message}"

    Required fields to complete an order: product, quantity, customer_name, delivery_address.
    For a product with variants, you also need every option filled in
    (e.g. size AND color) before it counts as fully identified.

    Rules:
    1. Extract anything new from this message. If a field is still
       missing, ask for exactly one of them next — don't ask for two
       things at once.
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
    """
    return generate_structured(prompt, OrderExtraction)