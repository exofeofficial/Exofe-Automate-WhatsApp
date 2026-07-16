from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.ai_api_key:
            raise RuntimeError("AI_API_KEY is not set — AI features are unavailable")
        _client = genai.Client(api_key=settings.ai_api_key)
    return _client

def generate_structured(prompt: str, schema: type[BaseModel]) -> BaseModel:
    response = _get_client().models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.2,
        ),
    )
    return response.parsed