"""voice service — engine registry + /voice wiring (model-free).

Real synthesis is covered by the `*_real` tests, skipped unless the matching
env flag is set (CI must not download/run the models — engine extras are
opt-in).
"""

from __future__ import annotations

import os

import pytest

from capsule_voice import engine as voice_engine


class _FakeEngine:
    name = "fake"

    def synthesize(self, text, *, lang="en_US", voice=None, speed=1.0) -> bytes:
        return b"RIFF\x00\x00\x00\x00WAVEfake-" + text.encode("utf-8")


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_get_engine_unknown_raises():
    with pytest.raises(ValueError, match="unknown TTS engine"):
        voice_engine.get_engine("does-not-exist")


def test_list_engines_registry():
    assert voice_engine.list_engines() == ["chatterbox", "kokoro"]


def test_engines_endpoint(client):
    body = client.get("/voice/engines").json()
    assert set(body["engines"]) == {"chatterbox", "kokoro"}
    assert body["default"] == "kokoro"


def test_speak_unknown_engine_400(client):
    r = client.get("/voice/speak", params={"text": "hi", "engine": "bogus"})
    assert r.status_code == 400
    assert "unknown TTS engine" in r.json()["detail"]


def test_speak_empty_text_400(client):
    r = client.get("/voice/speak", params={"text": "   "})
    assert r.status_code == 400


def test_speak_returns_wav(client, monkeypatch):
    # Inject a fake engine so the route is exercised without a TTS model.
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: _FakeEngine())
    r = client.get("/voice/speak", params={"text": "happy"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    assert r.content.startswith(b"RIFF")


@pytest.mark.skipif(
    not os.getenv("VOICE_MODEL_AVAILABLE"),
    reason="Kokoro model not installed (set VOICE_MODEL_AVAILABLE to run)",
)
def test_voice_engine_kokoro_real():
    audio = voice_engine.get_engine("kokoro").synthesize("hi")
    assert audio[:4] == b"RIFF"


@pytest.mark.skipif(
    not os.getenv("VOICE_CHATTERBOX_AVAILABLE"),
    reason="Chatterbox model not installed (set VOICE_CHATTERBOX_AVAILABLE to run)",
)
def test_voice_engine_chatterbox_real():
    audio = voice_engine.get_engine("chatterbox").synthesize("hi")
    assert audio[:4] == b"RIFF"
