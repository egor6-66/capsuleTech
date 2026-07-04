"""Service settings — drop-in SQLite→Postgres via DATABASE_URL (ADR 055 D3)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Plain env names (DATABASE_URL, PORT) — drop-in Postgres later.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./lang.db"
    port: int = 8002
    default_lang: str = "en_US"
    # Lessons vault path (ADR 069 D3). Air-gapped: no default path baked in —
    # supplied via env `LESSONS_VAULT` (dev value documented in README only).
    lessons_vault: str | None = None


settings = Settings()
