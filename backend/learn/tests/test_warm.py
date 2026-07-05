"""warm-voice — best-effort curated pre-generation (ADR 076, brief 2).

Drives `warm_all` directly with respx-mocked lang + voice; no live services.
Covers: full engine list + correct kind per batch, idempotency signal
forwarded from voice, and warm failures never propagating (best-effort).
"""

from __future__ import annotations

import asyncio
import json

import httpx
import respx

from capsule_learn.clients.lang import LangClient
from capsule_learn.clients.voice import VoiceClient
from capsule_learn.config import settings
from capsule_learn.warm import warm_all
from conftest import ENGINES

SENSES = {"senses": [{"id": 1, "text": "eat"}, {"id": 2, "text": "come"}]}
DETAIL = {
    1: {"word": {"text": "eat", "lang": "en_US"}, "examples": [{"text": "I eat bread."}]},
    2: {"word": {"text": "come", "lang": "en_US"}, "examples": [{"text": "Come here."}]},
}


def _mock_lang(router: respx.Router) -> None:
    router.get(f"{settings.lang_url}/lang/senses").respond(json=SENSES)
    for sid, detail in DETAIL.items():
        router.get(f"{settings.lang_url}/lang/sense/{sid}").respond(json=detail)
    router.get(f"{settings.voice_url}/voice/engines").respond(json=ENGINES)


async def _warm() -> dict:
    lang = LangClient(settings.lang_url)
    voice = VoiceClient(settings.voice_url, settings.voice_public())
    try:
        return await warm_all(lang, voice)
    finally:
        await lang.aclose()
        await voice.aclose()


def test_warm_posts_all_engines_and_correct_kind():
    with respx.mock(assert_all_called=False) as router:
        _mock_lang(router)
        warm = router.post(f"{settings.voice_url}/voice/warm").respond(
            json={"generated": 2, "skipped": 0}
        )

        asyncio.run(_warm())

        # One POST for words, one for phrases (both batches fit in one chunk).
        assert warm.call_count == 2
        words_body = json.loads(warm.calls[0].request.content)
        phrases_body = json.loads(warm.calls[1].request.content)

        # Every registered engine is warmed, not just the default.
        assert words_body["engines"] == ENGINES["engines"]
        assert phrases_body["engines"] == ENGINES["engines"]

        assert words_body["kind"] == "words"
        assert [t["text"] for t in words_body["texts"]] == ["eat", "come"]

        assert phrases_body["kind"] == "phrases"
        assert [t["text"] for t in phrases_body["texts"]] == ["I eat bread.", "Come here."]


def test_warm_forwards_voice_idempotency_signal():
    # A stateful voice: first pass generates, a rerun skips already-warmed keys
    # (voice-side skip-if-exists, brief 1) — learn aggregates the counts it gets.
    calls = {"n": 0}

    def responder(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        # first two POSTs (words+phrases) generate; the rerun skips.
        if calls["n"] <= 2:
            return httpx.Response(200, json={"generated": 2, "skipped": 0})
        return httpx.Response(200, json={"generated": 0, "skipped": 2})

    with respx.mock(assert_all_called=False) as router:
        _mock_lang(router)
        router.post(f"{settings.voice_url}/voice/warm").mock(side_effect=responder)

        first = asyncio.run(_warm())
        second = asyncio.run(_warm())

        assert first["words"]["generated"] == 2 and first["words"]["skipped"] == 0
        # rerun: nothing generated, everything skipped (voice already has it).
        assert second["words"]["generated"] == 0 and second["words"]["skipped"] == 2
        assert calls["n"] == 4  # 2 kinds × 2 runs


def test_warm_failure_does_not_raise():
    # voice /voice/warm errors → warm swallows it, warm_all still returns.
    with respx.mock(assert_all_called=False) as router:
        _mock_lang(router)
        router.post(f"{settings.voice_url}/voice/warm").mock(
            side_effect=httpx.ConnectError("refused")
        )

        summary = asyncio.run(_warm())  # must not raise

        # Best-effort: no counts, but the pipeline (this command) survives.
        assert summary["words"] == {"generated": 0, "skipped": 0}
        assert summary["phrases"] == {"generated": 0, "skipped": 0}
