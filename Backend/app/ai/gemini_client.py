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

# gemini-2.5-flash returns 404 "no longer available to new users" on
# newly-issued API keys — gemini-flash-latest/gemini-flash-lite-latest
# are the aliases that actually work. Tried in order since the non-lite
# alias occasionally 503s under high demand; falling through to the lite
# one keeps the AI responding instead of failing the whole conversation.
_MODELS = ("gemini-flash-latest", "gemini-flash-lite-latest")


def generate_structured(prompt: str, schema: type[BaseModel]) -> BaseModel:
    last_error: Exception | None = None
    for model in _MODELS:
        try:
            response = _get_client().models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=0.2,
                ),
            )
            if response.parsed is None:
                raise RuntimeError(f"Gemini didn't return valid structured output for schema {schema.__name__}")
            return response.parsed
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Gemini call failed on every model: {last_error}") from last_error