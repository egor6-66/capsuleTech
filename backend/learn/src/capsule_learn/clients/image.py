"""image client — engines cache + render-URL builder (ADR 067 D2).

Mirror of clients/voice.py: learn never proxies image bytes, it composes a
ready-to-display public URL and gates on the engine list. Image being down
degrades to `image: null` upstream of here (a word without a picture beats a
502).
"""

from __future__ import annotations

import logging
import time
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)

TIMEOUT = 3.0
ENGINES_TTL = 300.0
# A failed probe is also cached, briefly — otherwise every sense request
# would eat a full connect timeout while image is down.
FAILURE_TTL = 30.0


class ImageClient:
    def __init__(self, base_url: str, public_url: str) -> None:
        self._http = httpx.AsyncClient(base_url=base_url, timeout=TIMEOUT)
        self.public_url = public_url.rstrip("/")
        self._engines: list[str] | None = None
        self._valid_until = 0.0

    async def aclose(self) -> None:
        await self._http.aclose()

    async def engines(self) -> list[str] | None:
        """Cached engine list; None while image is unreachable."""
        now = time.monotonic()
        if now < self._valid_until:
            return self._engines
        try:
            resp = await self._http.get("/image/engines")
            resp.raise_for_status()
            self._engines = list(resp.json()["engines"])
            self._valid_until = now + ENGINES_TTL
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("image unavailable — senses go out without image: %s", exc)
            self._engines = None
            self._valid_until = now + FAILURE_TTL
        return self._engines

    def render_url(self, prompt: str) -> str:
        return f"{self.public_url}/image/render?{urlencode({'prompt': prompt})}"
