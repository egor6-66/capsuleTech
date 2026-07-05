"""Service settings — auth-session passthrough + MinIO + internal channel (ADR 071).

Plain env names (DATABASE_URL, PORT, AUTH_URL, S3_*, INTERNAL_KEY) — drop-in
Postgres/MinIO later without code changes. Storage and the internal-events
channel are OPT-IN: empty env keeps the service running while the matching
endpoint answers 503 (ADR 071 D3/D4).
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./community.db"
    port: int = 8006

    # Session resolution — community proxies the request cookie to auth (ADR 071 D2).
    auth_url: str = "http://localhost:8004"

    # MinIO / S3 — empty = avatar endpoint answers 503 "storage not configured".
    s3_url: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_secure: bool = False

    # Internal server-to-server events channel — empty = /internal/* answers 503.
    internal_key: str = ""

    # Empty = no CORS middleware (dev-gateway keeps everything same-origin, ADR 068 D5/D6).
    cors_origins: list[str] = []


settings = Settings()
