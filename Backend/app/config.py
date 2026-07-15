from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str | None = None
    resend_api_key: str | None = None
    redis_url: str | None = None
    whatsapp_webhook_verify_token: str | None = None
    whatsapp_cloud_api_token: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket_name: str | None = None
    ai_api_key: str | None = None
    cors_origins: str = "http://localhost:3000"
    email_from: str = "Exofe <onboarding@resend.dev>"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

settings = Settings()
