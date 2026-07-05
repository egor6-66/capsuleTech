"""Service settings — plain env names, model paths optional for air-gapped/prod."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8005

    # text-to-image — pluggable engine (per-request override via ?engine=).
    image_engine: str = "sdxl-turbo"
    default_size: str = "512x512"
    default_seed: int = 0

    # disk cache — generation is expensive, so it survives restarts (unlike
    # voice's in-memory LRU). Relative to the service cwd by default.
    cache_dir: str = ".cache/images"

    torch_device: str | None = None  # cuda|cpu for torch engines; default auto
    sdxl_model_path: str | None = None  # local snapshot / model id override (air-gapped)
    flux_model_path: str | None = None  # local snapshot / model id override (air-gapped)


settings = Settings()
