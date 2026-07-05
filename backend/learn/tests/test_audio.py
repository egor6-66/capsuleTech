"""Audio composition — voice link + engines cache, graceful voice-down."""

from __future__ import annotations

import httpx

from capsule_learn.config import settings
from conftest import ENGINES, SENSE_DETAIL, SENSE_LIST_ITEM


def test_audio_block_url_encoded_and_engines_cached(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/senses").respond(json={"senses": [SENSE_LIST_ITEM]})
    # Same-pattern registration replaces the conftest route — re-mock fully.
    engines_route = upstream.get(f"{settings.voice_url}/voice/engines")
    engines_route.respond(json=ENGINES)

    resp = client.get("/learn/lang/senses")
    audio = resp.json()["senses"][0]["audio"]
    # Ready-to-play public link, text URL-encoded; never audio bytes. Carries
    # the resolved engine (default "kokoro") + storage kind=words (ADR 076).
    assert audio["url"] == (
        f"{settings.voice_url}/voice/speak"
        "?engine=kokoro&kind=words&text=ice+cream&lang=en_US"
    )
    assert audio["engines"] == ["kokoro", "chatterbox"]

    client.get("/learn/lang/senses")
    assert engines_route.call_count == 1  # in-memory TTL cache — one probe


def test_detail_audio_uses_word_lang(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/sense/1").respond(json=SENSE_DETAIL)
    resp = client.get("/learn/lang/sense/1")
    audio = resp.json()["audio"]
    assert audio["url"] == (
        f"{settings.voice_url}/voice/speak"
        "?engine=kokoro&kind=words&text=ice+cream&lang=en_US"
    )


def test_voice_down_yields_null_audio_not_error(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/senses").respond(json={"senses": [SENSE_LIST_ITEM]})
    upstream.get(f"{settings.voice_url}/voice/engines").mock(
        side_effect=httpx.ConnectError("refused")
    )
    resp = client.get("/learn/lang/senses")
    assert resp.status_code == 200  # a word without audio beats a 502
    assert resp.json()["senses"][0]["audio"] is None
