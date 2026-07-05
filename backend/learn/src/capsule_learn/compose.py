"""Shared media-enrichment helpers — audio/image blocks over voice + image.

Both the senses router (`api.py`) and the lessons router (`lessons_api.py`)
enrich words the same way: a ready-to-play `audio` link (voice) and a
ready-to-display `image` link (image), each degrading to `None` when its
upstream is down. Kept here so the two routers share one composer, not a copy.
"""

from __future__ import annotations

from typing import Any

from .clients.image import ImageClient
from .clients.voice import VoiceClient


async def audio_block(
    voice: VoiceClient, text: str, lang: str, kind: str
) -> dict[str, Any] | None:
    # `kind` (ADR 076) is the storage policy baked into the URL: words/phrases
    # are curated → voice persists them in MinIO; dynamic is LRU-only. Callers
    # here compose curated content (words/example phrases), never `dynamic`.
    engines = await voice.engines()
    if not engines:
        return None
    engine = voice.default_engine()
    if engine is None:  # engines present but no resolvable default — treat as down
        return None
    return {"url": voice.speak_url(text, lang, kind, engine), "engines": engines}


async def image_block(image: ImageClient, text: str, pos: str) -> dict[str, Any] | None:
    # Prompt strategy v1 (TEMPORARY): a plain "{text} ({pos})" stub. The
    # teacher-curated "образ" field is being refined in lang (lessons wave);
    # once it lands enriched, switch the prompt to it. Do NOT invent prompt
    # engineering here now. (brief backend-learn-image-compose, ADR 067)
    if await image.engines() is None:
        return None
    return {"url": image.render_url(f"{text} ({pos})")}
