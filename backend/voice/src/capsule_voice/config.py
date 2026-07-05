"""Service settings — plain env names, model paths optional for air-gapped/prod."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8001
    default_lang: str = "en_US"

    # TTS — pluggable engine (per-request override via ?engine=).
    voice_engine: str = "kokoro"
    kokoro_model_path: str | None = None
    kokoro_voices_path: str | None = None
    chatterbox_model_path: str | None = None  # local checkpoint dir (air-gapped)
    piper_model_path: str | None = None  # local .onnx voice (air-gapped)
    torch_device: str | None = None  # cuda|cpu for torch engines (chatterbox); default auto

    # Persistent tier — MinIO/S3 object store (ADR 076). Curated synthesis
    # (words / accepted phrases) is stored once and served forever; dynamic
    # synthesis stays in the in-memory LRU only. Unset endpoint -> tier off.
    minio_endpoint: str | None = None  # host:port; None disables the persist tier
    minio_bucket: str = "voice"
    minio_access_key: str | None = None
    minio_secret_key: str | None = None
    minio_secure: bool = False  # TLS to the object store
    # Bumping this invalidates every stored key + ETag (part of the canonical
    # hash) — a model/voice upgrade forces regeneration instead of stale audio.
    voice_model_version: str = "v1"


settings = Settings()
