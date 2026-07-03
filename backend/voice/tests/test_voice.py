"""voice service — engine registry + /voice wiring (model-free).

Real synthesis is covered by the `*_real` tests, skipped unless the matching
env flag is set (CI must not download/run the models — engine extras are
opt-in).
"""

from __future__ import annotations

import os

import pytest

from capsule_voice import api as voice_api
from capsule_voice import engine as voice_engine


@pytest.fixture(autouse=True)
def _clear_speak_cache():
    voice_api._cache.clear()


class _FakeEngine:
    name = "fake"

    def synthesize(self, text, *, lang="en_US", voice=None, speed=1.0) -> bytes:
        return b"RIFF\x00\x00\x00\x00WAVEfake-" + text.encode("utf-8")


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_get_engine_unknown_raises():
    with pytest.raises(ValueError, match="unknown TTS engine"):
        voice_engine.get_engine("does-not-exist")


ALL_ENGINES = ["chatterbox", "edge", "f5", "kokoro", "piper"]


def test_list_engines_registry():
    assert voice_engine.list_engines() == ALL_ENGINES


def test_engines_endpoint(client):
    body = client.get("/voice/engines").json()
    assert body["engines"] == ALL_ENGINES
    assert body["default"] == "kokoro"


def test_speak_unknown_engine_400(client):
    r = client.get("/voice/speak", params={"text": "hi", "engine": "bogus"})
    assert r.status_code == 400
    assert "unknown TTS engine" in r.json()["detail"]


def test_speak_empty_text_400(client):
    r = client.get("/voice/speak", params={"text": "   "})
    assert r.status_code == 400


class _CountingEngine:
    def __init__(self, name="fake"):
        self.name = name
        self.calls = 0

    def synthesize(self, text, *, lang="en_US", voice=None, speed=1.0) -> bytes:
        self.calls += 1
        return b"RIFF\x00\x00\x00\x00WAVEfake-" + text.encode("utf-8")


def test_speak_cache_hit_synthesizes_once(client, monkeypatch):
    eng = _CountingEngine()
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    r1 = client.get("/voice/speak", params={"text": "hello"})
    r2 = client.get("/voice/speak", params={"text": "hello"})
    assert r1.status_code == r2.status_code == 200
    assert r1.content == r2.content
    assert eng.calls == 1


def test_speak_cache_headers_present(client, monkeypatch):
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: _CountingEngine())
    r = client.get("/voice/speak", params={"text": "hello"})
    assert r.headers["cache-control"] == "public, max-age=86400"
    assert r.headers["etag"].startswith('"')


def test_speak_if_none_match_304_without_synthesis(client, monkeypatch):
    eng = _CountingEngine()
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    etag = client.get("/voice/speak", params={"text": "hello"}).headers["etag"]
    voice_api._cache.clear()  # revalidation must not cost a synthesis even uncached
    calls_before = eng.calls
    r = client.get(
        "/voice/speak", params={"text": "hello"}, headers={"If-None-Match": etag}
    )
    assert r.status_code == 304
    assert r.headers["etag"] == etag
    assert eng.calls == calls_before


def test_speak_cache_varies_by_params(client, monkeypatch):
    engines = {}

    def _get(name=None):
        return engines.setdefault(name or "kokoro", _CountingEngine(name or "kokoro"))

    monkeypatch.setattr(voice_engine, "get_engine", _get)
    e1 = client.get("/voice/speak", params={"text": "hello"}).headers["etag"]
    e2 = client.get("/voice/speak", params={"text": "hello", "speed": 2}).headers["etag"]
    e3 = client.get("/voice/speak", params={"text": "hello", "engine": "piper"}).headers["etag"]
    assert len({e1, e2, e3}) == 3
    assert engines["kokoro"].calls == 2  # base + speed variant
    assert engines["piper"].calls == 1


class _NotInstalledEngine:
    name = "chatterbox"

    def synthesize(self, text, *, lang="en_US", voice=None, speed=1.0) -> bytes:
        raise ModuleNotFoundError("No module named 'chatterbox'", name="chatterbox")


def test_speak_engine_not_installed_503(client, monkeypatch):
    # Registered-but-not-installed engine (lazy extras) -> actionable 503, not a raw 500.
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: _NotInstalledEngine())
    r = client.get("/voice/speak", params={"text": "hi", "engine": "chatterbox"})
    assert r.status_code == 503
    assert "uv sync --extra voice-chatterbox" in r.json()["detail"]


def test_speak_returns_wav(client, monkeypatch):
    # Inject a fake engine so the route is exercised without a TTS model.
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: _FakeEngine())
    r = client.get("/voice/speak", params={"text": "happy"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "audio/wav"
    assert r.content.startswith(b"RIFF")


# Real synthesis, opt-in per engine: VOICE_REAL_ENGINES="kokoro,piper" (or "all").
# CI never sets it — engine extras are opt-in and models must not download there.
def _real_enabled(name: str) -> bool:
    enabled = os.getenv("VOICE_REAL_ENGINES", "")
    return enabled == "all" or name in {e.strip() for e in enabled.split(",")}


@pytest.mark.parametrize("name", ALL_ENGINES)
def test_voice_engine_real(name):
    if not _real_enabled(name):
        pytest.skip(f"engine {name!r} not enabled (set VOICE_REAL_ENGINES={name} to run)")
    audio = voice_engine.get_engine(name).synthesize("hi")
    assert audio[:4] == b"RIFF"
