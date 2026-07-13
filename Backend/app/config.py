from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    db_user: str
    db_pass: str
    db_host: str
    db_port: int = 5432
    db_name: str
    jwt_secret: str
    whatsapp_access_token: str
    whatsapp_verify_token: str
    ai_api_key: str

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.db_user}:{self.db_pass}@{self.db_host}:{self.db_port}/{self.db_name}"

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8"
    )

settings = Settings()