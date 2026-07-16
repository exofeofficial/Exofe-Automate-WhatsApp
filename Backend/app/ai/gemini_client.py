from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings

_client = genai.Client(api_key=settings.ai_api_key)

def generate_structured(prompt: str, schema: type[BaseModel]) -> BaseModel:
    response = _client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.2,
        ),
    )
    return response.parsed