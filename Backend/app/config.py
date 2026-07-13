from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    redis_url: str
    whatsapp_cloud_api_token: str
    whatsapp_webhook_verify_token: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str
    ai_api_key: str

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8"
    )

settings = Settings()