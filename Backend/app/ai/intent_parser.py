# app/ai/intent_parser.py
#
# Fix: the has_active_draft=True case had no return at all — fell off
# the end of the function returning None, which crashed any caller
# doing intent.kind. When a draft is active, skip the Gemini call
# entirely (the customer is almost certainly answering the question we
# just asked) rather than spending a call to reach the same conclusion.

from typing import Literal

from pydantic import BaseModel, Field

from app.ai import gemini_client


class Intent(BaseModel):
    kind: Literal["greeting", "faq", "order", "browse_catalog", "unclear"]
    confidence: float = Field(..., ge=0, le=1)


def classify_intent(message: str, has_active_draft: bool) -> Intent:
    if has_active_draft:
        return Intent(kind="order", confidence=1.0)

    prompt = f"""
    Classify the customer's message into exactly one of:
    1. greeting (Hi, Hello, etc)
    2. order (I want to order a specific item they already named, Place an order, etc)
    3. browse_catalog (show me the catalog, what do you have, mujhe catalog dikhao,
       browsing/exploring what's available without naming a specific product)
    4. faq (Do you offer this, How much is this, etc)
    5. unclear (anything that doesn't clearly fit the above)

    Message: "{message}"

    Return the intent and your confidence (0 to 1).
    """
    return gemini_client.generate_structured(prompt, Intent)