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
    torch_device: str | None = None  # cuda|cpu for torch engines (chatterbox/f5); default auto


settings = Settings()
