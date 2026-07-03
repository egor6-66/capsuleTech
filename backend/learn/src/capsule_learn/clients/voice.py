"""voice client — engines cache + speak-URL builder (ADR 067 D2).

Learn never proxies audio bytes: it composes a ready-to-play public URL and
the engine list. Voice being down degrades to `audio: null` upstream of here
(a word without audio beats a 502).
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
# would eat a full connect timeout while voice is down.
FAILURE_TTL = 30.0


class VoiceClient:
    def __init__(self, base_url: str, public_url: str) -> None:
        self._http = httpx.AsyncClient(base_url=base_url, timeout=TIMEOUT)
        self.public_url = public_url.rstrip("/")
        self._engines: list[str] | None = None
        self._valid_until = 0.0

    async def aclose(self) -> None:
        await self._http.aclose()

    async def engines(self) -> list[str] | None:
        """Cached engine list; None while voice is unreachable."""
        now = time.monotonic()
        if now < self._valid_until:
            return self._engines
        try:
            resp = await self._http.get("/voice/engines")
            resp.raise_for_status()
            self._engines = list(resp.json()["engines"])
            self._valid_until = now + ENGINES_TTL
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("voice unavailable — senses go out without audio: %s", exc)
            self._engines = None
            self._valid_until = now + FAILURE_TTL
        return self._engines

    def speak_url(self, text: str, lang: str) -> str:
        return f"{self.public_url}/voice/speak?{urlencode({'text': text, 'lang': lang})}"
