from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str

    # Everything below this line is required by features that aren't built
    # yet (auth, WhatsApp, file uploads, AI). Optional for now so the app
    # can boot and serve the endpoints that ARE implemented (waitlist, demo
    # booking) without needing every integration configured. Make these
    # required again as each feature actually starts using them.
    jwt_secret: str | None = None
    redis_url: str | None = None
    whatsapp_webhook_verify_token: str | None = None
    whatsapp_cloud_api_token: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket_name: str | None = None
    ai_api_key: str | None = None

    # Comma separated list of origins allowed to call this API from a
    # browser, e.g. "http://localhost:3000,https://app.exofe.com".
    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

settings = Settings()
