"""warm-voice — best-effort curated-audio pre-generation (ADR 076, brief 2).

Run AFTER a lang content import (not on app start — the dictionary grows on
ingest, not boot). Pushes every curated word (kind=words) and example phrase
(kind=phrases) to voice's POST /voice/warm across all registered engines. Voice
persists each synth once in MinIO and skips already-warmed keys (brief 1), so
reruns are cheap and idempotent. Any warm failure is swallowed — speak still
synthesizes on demand, so a down voice/MinIO never blocks content ingest.

    uv run python -m capsule_learn.warm
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from .clients.lang import LangClient, LangError
from .clients.voice import VoiceClient
from .config import settings

logger = logging.getLogger(__name__)

# Texts per /voice/warm POST — bounds each request (the dictionary grows) and
# gives incremental progress; voice's skip-if-exists makes partial reruns cheap.
BATCH = 50


async def _collect(lang: LangClient) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Gather curated texts from lang: word headwords (→ kind=words) and example
    phrases (→ kind=phrases). Examples live on sense detail, so each sense is
    fetched once. Deduped, order-stable."""
    data = await lang.senses({"lang": settings.default_lang})
    senses = data["senses"]

    words: list[dict[str, Any]] = []
    seen_words: set[str] = set()
    for s in senses:
        text = s["text"]
        if text and text not in seen_words:
            seen_words.add(text)
            words.append({"text": text, "lang": settings.default_lang})

    phrases: list[dict[str, Any]] = []
    seen_phrases: set[str] = set()
    for s in senses:
        detail = await lang.sense(s["id"])
        word_lang = detail["word"]["lang"]
        for ex in detail.get("examples", []):
            text = ex.get("text")
            if text and text not in seen_phrases:
                seen_phrases.add(text)
                phrases.append({"text": text, "lang": word_lang})

    return words, phrases


async def _warm_kind(
    voice: VoiceClient, texts: list[dict[str, Any]], engines: list[str], kind: str
) -> dict[str, int]:
    """Warm one kind in bounded batches; aggregate {generated, skipped}. A
    failing batch is logged and skipped inside voice.warm — never raised."""
    total = {"generated": 0, "skipped": 0}
    for i in range(0, len(texts), BATCH):
        chunk = texts[i : i + BATCH]
        result = await voice.warm(chunk, engines, kind)
        if result is not None:
            total["generated"] += int(result.get("generated", 0))
            total["skipped"] += int(result.get("skipped", 0))
        logger.info(
            "warm %s: %d/%d texts pushed", kind, min(i + BATCH, len(texts)), len(texts)
        )
    return total


async def warm_all(lang: LangClient, voice: VoiceClient) -> dict[str, dict[str, int]]:
    """Collect curated content and warm every registered engine. Best-effort:
    voice down (no engines) → nothing warmed; a lang failure raises LangError
    (no content → nothing to warm) and is handled by the caller."""
    engines = await voice.engines()
    if not engines:
        logger.warning("voice has no engines (down?) — nothing warmed")
        return {}

    words, phrases = await _collect(lang)
    logger.info(
        "warming %d words + %d phrases across %d engines: %s",
        len(words),
        len(phrases),
        len(engines),
        engines,
    )
    return {
        "words": await _warm_kind(voice, words, engines, "words"),
        "phrases": await _warm_kind(voice, phrases, engines, "phrases"),
    }


async def _run() -> None:
    lang = LangClient(settings.lang_url)
    voice = VoiceClient(settings.voice_url, settings.voice_public())
    try:
        summary = await warm_all(lang, voice)
        logger.info("warm-voice done: %s", summary)
    except LangError as exc:
        # lang down → no curated content to warm; non-fatal (best-effort job).
        logger.error("warm-voice aborted — lang unavailable: %s", exc)
    finally:
        await lang.aclose()
        await voice.aclose()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    asyncio.run(_run())


if __name__ == "__main__":
    main()
