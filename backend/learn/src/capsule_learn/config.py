"""Service settings — upstream capability-service links (ADR 067 D4)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Plain env names (LANG_URL, VOICE_URL, ...) — service-to-service wiring.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    lang_url: str = "http://localhost:8002"
    voice_url: str = "http://localhost:8001"
    image_url: str = "http://localhost:8005"
    # Browser-facing voice base for composed audio.url links; diverges from
    # voice_url only behind a reverse proxy in deployment.
    voice_public_url: str | None = None
    # Browser-facing image base for composed image.url links (in dev this is
    # the gateway = "/api"); diverges from image_url only behind a proxy.
    image_public_url: str | None = None
    port: int = 8003
    default_lang: str = "en_US"

    def voice_public(self) -> str:
        return self.voice_public_url or self.voice_url

    def image_public(self) -> str:
        return self.image_public_url or self.image_url


settings = Settings()
