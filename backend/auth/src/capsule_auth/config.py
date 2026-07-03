"""Service settings — httpOnly session cookie + drop-in SQLite→Postgres (ADR 068)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Plain env names (DATABASE_URL, PORT) — drop-in Postgres later.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./auth.db"
    port: int = 8004
    session_ttl_days: int = 30
    cookie_name: str = "capsule_session"
    cookie_secure: bool = False
    # Empty = no CORS middleware (dev-gateway keeps everything same-origin, ADR 068 D5/D6).
    cors_origins: list[str] = []


settings = Settings()
