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
def test_voice_engine_real():
    audio = voice_engine.get_engine("kokoro").synthesize("hi")
    assert audio[:4] == b"RIFF"
