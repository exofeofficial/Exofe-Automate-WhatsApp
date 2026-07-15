from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str

    # These are for features that aren't built yet (auth, WhatsApp, file
    # uploads, AI). Made them optional so the app can still start and run
    # waitlist/demo booking without needing every single one configured.
    # Once each feature actually gets built, make its variable required.
    jwt_secret: str | None = None
    redis_url: str | None = None
    whatsapp_webhook_verify_token: str | None = None
    whatsapp_cloud_api_token: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket_name: str | None = None
    ai_api_key: str | None = None

    # Comma separated list of frontend URLs allowed to call this API,
    # e.g. "http://localhost:3000,https://app.exofe.com".
    cors_origins: str = "http://localhost:3000"

    # Resend, used for waitlist/demo confirmation emails for now, auth
    # verification emails will use this too once auth gets built. Optional
    # for the same reason as the settings above, no key means email sending
    # just gets skipped instead of crashing the app.
    resend_api_key: str | None = None
    # Resend's own onboarding@resend.dev works without verifying a domain,
    # but it can only send to the email you signed up to Resend with.
    # Switch this once a real domain is verified in the Resend dashboard.
    email_from: str = "Exofe <onboarding@resend.dev>"

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
