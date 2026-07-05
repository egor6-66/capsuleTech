"""voice client — engines cache + speak-URL builder + warm (ADR 067 D2 / ADR 076).

Learn never proxies audio bytes: it composes a ready-to-play public URL and
the engine list. Voice being down degrades to `audio: null` upstream of here
(a word without audio beats a 502).

The composed `speak_url` bakes in a resolved `engine` and a storage `kind`
(ADR 076): `words`/`phrases` are curated → voice persists them in MinIO;
`dynamic` is LRU-only. `warm()` drives the pre-generation batch (brief 2).
"""

from __future__ import annotations

import logging
import time
from typing import Any
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)

TIMEOUT = 3.0
ENGINES_TTL = 300.0
# A failed probe is also cached, briefly — otherwise every sense request
# would eat a full connect timeout while voice is down.
FAILURE_TTL = 30.0
# Warming synthesizes on a cold cache (chatterbox ~8s/item) — a batch needs a
# far more generous ceiling than the per-request TIMEOUT.
WARM_TIMEOUT = 600.0


class VoiceClient:
    def __init__(self, base_url: str, public_url: str) -> None:
        self._http = httpx.AsyncClient(base_url=base_url, timeout=TIMEOUT)
        self.public_url = public_url.rstrip("/")
        self._engines: list[str] | None = None
        self._default: str | None = None
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
            payload = resp.json()
            self._engines = list(payload["engines"])
            # Resolved engine baked into audio.url; fall back to the first
            # listed engine if voice omits an explicit default.
            self._default = payload.get("default") or (
                self._engines[0] if self._engines else None
            )
            self._valid_until = now + ENGINES_TTL
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("voice unavailable — senses go out without audio: %s", exc)
            self._engines = None
            self._default = None
            self._valid_until = now + FAILURE_TTL
        return self._engines

    def default_engine(self) -> str | None:
        """The resolved engine baked into composed speak URLs; set alongside
        the engine list on a successful probe."""
        return self._default

    def speak_url(self, text: str, lang: str, kind: str, engine: str) -> str:
        # engine pins which voice rendered the clip; kind is the storage policy
        # (ADR 076): words/phrases persist in MinIO, dynamic stays LRU-only.
        return f"{self.public_url}/voice/speak?" + urlencode(
            {"engine": engine, "kind": kind, "text": text, "lang": lang}
        )

    async def warm(
        self, texts: list[dict[str, Any]], engines: list[str], kind: str
    ) -> dict[str, Any] | None:
        """Best-effort pre-generation — POST /voice/warm (ADR 076, brief 2).

        Returns voice's `{generated, skipped}` summary, or None if the batch
        was rejected. Warm never blocks the content pipeline: on any failure we
        log and move on — speak still synthesizes on demand.
        """
        try:
            resp = await self._http.post(
                "/voice/warm",
                json={"texts": texts, "engines": engines, "kind": kind},
                timeout=WARM_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning(
                "voice warm failed (kind=%s) — speak will synth on demand: %s", kind, exc
            )
            return None
