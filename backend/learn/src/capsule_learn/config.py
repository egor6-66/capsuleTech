"""Service settings — drop-in SQLite→Postgres via DATABASE_URL (ADR 055 D3)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Plain env names (DATABASE_URL, PORT) — drop-in Postgres later.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./learn.db"
    port: int = 8003
    default_lang: str = "en_US"


settings = Settings()
