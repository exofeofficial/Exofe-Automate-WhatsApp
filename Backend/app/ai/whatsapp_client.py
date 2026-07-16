from google import genai
from app.config import settings

client = genai.Client(api_key=settings.ai_api_key)

r = client.models.generate_content(
    model="gemini-2.5-flash", 
    contents="Say hi in 3 words"
)
print(r.text)