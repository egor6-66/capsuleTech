"""Service settings — plain env names, model path optional for air-gapped/prod."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8007

    # text generation — pluggable engine (per-request override via body `engine`).
    llm_engine: str = "llama-cpp"

    # llama-cpp: local GGUF weights. User-supplied + air-gapped — no default path,
    # no hardcoded URL (ADR 065). Absent => the engine 503s "model not configured".
    llm_model_path: str | None = None
    n_gpu_layers: int = 0  # 0 = CPU; >0 offloads layers to GPU (3070 Ti etc.)
    n_ctx: int = 4096  # context window for the loaded model


settings = Settings()
