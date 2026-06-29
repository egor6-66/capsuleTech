"""voice module — engine registry + /speak wiring (model-free).

The real Kokoro synthesis is covered by `test_voice_engine_real`, skipped
unless VOICE_MODEL_AVAILABLE is set (CI must not download/run the model).
"""

from __future__ import annotations

import os

import pytest

from capsule_learn.modules.voice import engine as voice_engine


class _FakeEngine:
    name = "fake"

    def synthesize(self, text, *, lang="en_US", voice=None, speed=1.0) -> bytes:
        return b"RIFF\x00\x00\x00\x00WAVEfake-" + text.encode("utf-8")


def test_get_engine_unknown_raises():
    with pytest.raises(ValueError, match="unknown TTS engine"):
        voice_engine.get_engine("does-not-exist")


def test_engines_endpoint(client):
    body = client.get("/learn/voice/engines").json()
    assert set(body["engines"]) >= {"kokoro", "styletts2"}
    assert body["default"]


def test_speak_unknown_engine_400(client):
    r = client.get("/learn/voice/speak", params={"text": "hi", "engine": "bogus"})
    assert r.status_code == 400
    assert "unknown TTS engine" in r.json()["detail"]


def test_speak_empty_text_400(client):
    r = client.get("/learn/voice/speak", params={"text": "   "})
    assert r.status_code == 400


def test_speak_returns_wav(client, monkeypatch):
    # Inject a fake engine so the route is exercised without the TTS model.
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: _FakeEngine())
    r = client.get("/learn/voice/speak", params={"text": "happy"})
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
    not os.getenv("VOICE_STYLETTS2_AVAILABLE"),
    reason="StyleTTS2 model/espeak-ng not installed (set VOICE_STYLETTS2_AVAILABLE)",
)
def test_voice_engine_styletts2_real():
    audio = voice_engine.get_engine("styletts2").synthesize("hi")
    assert audio[:4] == b"RIFF"
