from pydantic import BaseModel
from app.ai.gemini_client import generate_structured

class OrderExtraction(BaseModel):
    updated_fields: dict[str, str]      # only the fields this message added/changed
    next_question: str | None           # what to ask next, in the business's tone — None if complete
    is_complete: bool                   # all required fields present?
    matched_product_id: str | None      # which catalog product, if any — see note below

def extract_order_update(*, message: str, current_draft: dict,
    product_catalog: list[dict],   # name, price, stock — ONLY active, in-stock products
    business_prompt: str,
    tone: str ) -> OrderExtraction:
    
    prompt = f"""
    
    {business_prompt}
    Respond in a {tone} tone.

    You are helping a customer complete an order. Here is what we know so far:
    {current_draft}

    Available products (ONLY use these — never invent a product, price, or
    stock level that isn't listed here):
    {product_catalog}

    Customer's latest message: "{message}"

    Required fields to complete an order: product, quantity, customer_name, delivery_address.
    Extract anything new from this message. If a field is still missing, ask
    for exactly one of them next — don't ask for two things at once.
    """
    result = generate_structured(prompt, OrderExtraction)
    return result