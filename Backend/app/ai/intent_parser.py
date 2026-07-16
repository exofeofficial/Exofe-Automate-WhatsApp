from typing import Literal
from pydantic import BaseModel, Field
from app.ai import gemini_client

class Intent(BaseModel):
    kind: Literal["greeting", "faq", "order", "unclear"]
    confidence: float = Field(..., ge=0, le=1)

def classify_intent(message: str, has_active_draft: bool) -> Intent:
    # has_active_draft matters: if there's already a draft in progress,
    # bias toward "order" unless the message clearly signals something else
    # (cancel, a question, etc). Build this bias into the prompt text.
    if not has_active_draft:
        prompt = f"""
        1. Greeting (Hi, Hello, etc)
        2. Order  (I want to order, Place an order, etc)
        3. FAQ (Do you offer this, How much is this, etc)
        4. Unclear (Anything else, Anything else)

        Classify the intent of the {message} and return the intent and confidence.
        """
        response = gemini_client.generate_structured(prompt, Intent)
        return response