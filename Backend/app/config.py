from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    jwt_secret: str | None = None
    resend_api_key: str | None = None
    redis_url: str | None = None
    whatsapp_webhook_verify_token: str | None = None
    whatsapp_cloud_api_token: str | None = None
    whatsapp_phone_number_id: str | None = None
    # Meta App Secret (App Dashboard > Settings > Basic) — used to verify
    # webhook POSTs actually came from Meta. Optional so the webhook still
    # works before this is set up, just without that check.
    whatsapp_app_secret: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket_name: str | None = None
    ai_api_key: str | None = None
    cors_origins: str = "http://localhost:3000"
    email_from: str = "Exofe <onboarding@resend.dev>"
    # Base URL of the deployed frontend — used to build clickable links in
    # emails (team invites, etc.) that point back at the right environment.
    frontend_url: str = "http://localhost:3000"

    # "Continue with Google" — the frontend sends us the ID token Google
    # Identity Services hands it after sign-in, and we verify it against
    # this client ID. GOOGLE_CLIENT_SECRET isn't used by that flow, kept
    # only for a possible future server-side OAuth flow.
    google_client_id: str | None = None
    google_client_secret: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

settings = Settings()
