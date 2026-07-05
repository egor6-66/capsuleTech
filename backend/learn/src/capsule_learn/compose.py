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


async def audio_block(voice: VoiceClient, text: str, lang: str) -> dict[str, Any] | None:
    engines = await voice.engines()
    if engines is None:
        return None
    return {"url": voice.speak_url(text, lang), "engines": engines}


async def image_block(image: ImageClient, text: str, pos: str) -> dict[str, Any] | None:
    # Prompt strategy v1 (TEMPORARY): a plain "{text} ({pos})" stub. The
    # teacher-curated "образ" field is being refined in lang (lessons wave);
    # once it lands enriched, switch the prompt to it. Do NOT invent prompt
    # engineering here now. (brief backend-learn-image-compose, ADR 067)
    if await image.engines() is None:
        return None
    return {"url": image.render_url(f"{text} ({pos})")}
