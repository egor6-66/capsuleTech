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
from capsule_voice import storage as voice_storage
from capsule_voice.config import settings


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


ALL_ENGINES = ["chatterbox", "kokoro", "piper"]


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


# --- Persistent tier (ADR 076) — mocked storage, fake counting engine --------


def test_speak_minio_hit_skips_synthesis(client, monkeypatch):
    # kind=words + object present -> served from MinIO, engine never runs.
    eng = _CountingEngine("kokoro")
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    monkeypatch.setattr(voice_storage, "get", lambda key: b"RIFF-from-minio")
    r = client.get("/voice/speak", params={"text": "cat", "kind": "words"})
    assert r.status_code == 200
    assert r.content == b"RIFF-from-minio"
    assert r.headers["content-type"] == "audio/wav"
    assert eng.calls == 0


def test_speak_dynamic_does_not_persist(client, monkeypatch):
    # Default kind=dynamic -> LRU only, MinIO put must not be called.
    eng = _CountingEngine("kokoro")
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    puts: list[str] = []
    monkeypatch.setattr(voice_storage, "get", lambda key: None)
    monkeypatch.setattr(voice_storage, "put", lambda key, data: puts.append(key))
    r = client.get("/voice/speak", params={"text": "cat"})
    assert r.status_code == 200
    assert eng.calls == 1
    assert puts == []


def test_speak_words_persists_after_synthesis(client, monkeypatch):
    # kind=words miss -> synthesize + put under the versioned key.
    eng = _CountingEngine("kokoro")
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    puts: dict[str, bytes] = {}
    monkeypatch.setattr(voice_storage, "get", lambda key: None)
    monkeypatch.setattr(voice_storage, "put", lambda key, data: puts.__setitem__(key, data))
    r = client.get("/voice/speak", params={"text": "cat", "kind": "words"})
    assert r.status_code == 200
    assert eng.calls == 1
    assert len(puts) == 1
    (obj_key,) = puts
    assert obj_key.startswith("voice/words/kokoro/")
    assert obj_key.endswith(".wav")


def test_speak_version_bump_changes_key(client, monkeypatch):
    # Bumping VOICE_MODEL_VERSION changes ETag + storage key -> resynthesize.
    eng = _CountingEngine("kokoro")
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    puts: list[str] = []
    monkeypatch.setattr(voice_storage, "get", lambda key: None)
    monkeypatch.setattr(voice_storage, "put", lambda key, data: puts.append(key))

    monkeypatch.setattr(settings, "voice_model_version", "v1")
    e1 = client.get("/voice/speak", params={"text": "cat", "kind": "words"}).headers["etag"]
    voice_api._cache.clear()
    monkeypatch.setattr(settings, "voice_model_version", "v2")
    e2 = client.get("/voice/speak", params={"text": "cat", "kind": "words"}).headers["etag"]

    assert e1 != e2
    assert eng.calls == 2
    assert len(set(puts)) == 2  # two distinct keys


def test_speak_storage_get_error_is_graceful(client, monkeypatch):
    # MinIO get raising must not 5xx — fall through to synthesis, 200.
    eng = _CountingEngine("kokoro")
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)

    def _boom(key):
        raise RuntimeError("minio unreachable")

    monkeypatch.setattr(voice_storage, "get", _boom)
    monkeypatch.setattr(voice_storage, "put", lambda key, data: None)
    r = client.get("/voice/speak", params={"text": "cat", "kind": "words"})
    assert r.status_code == 200
    assert r.content.startswith(b"RIFF")
    assert eng.calls == 1


def test_warm_idempotent(client, monkeypatch):
    # First run synthesizes+stores; second run skips everything (keys exist).
    eng = _CountingEngine("kokoro")
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    stored: set[str] = set()
    monkeypatch.setattr(voice_storage, "exists", lambda key: key in stored)
    monkeypatch.setattr(voice_storage, "put", lambda key, data: stored.add(key))

    body = {
        "texts": [{"text": "cat"}, {"text": "dog"}],
        "engines": ["kokoro"],
        "kind": "words",
    }
    r1 = client.post("/voice/warm", json=body).json()
    assert r1 == {"generated": 2, "skipped": 0}
    assert eng.calls == 2
    assert len(stored) == 2

    r2 = client.post("/voice/warm", json=body).json()
    assert r2 == {"generated": 0, "skipped": 2}
    assert eng.calls == 2  # nothing re-synthesized


def test_warm_one_pair_failure_does_not_break_batch(client, monkeypatch):
    # A synthesis error on one text must not abort the rest of the batch.
    class _FlakyEngine:
        name = "kokoro"

        def __init__(self):
            self.calls = 0

        def synthesize(self, text, *, lang="en_US", voice=None, speed=1.0) -> bytes:
            self.calls += 1
            if text == "boom":
                raise RuntimeError("synth exploded")
            return b"RIFF" + text.encode("utf-8")

    eng = _FlakyEngine()
    monkeypatch.setattr(voice_engine, "get_engine", lambda name=None: eng)
    monkeypatch.setattr(voice_storage, "exists", lambda key: False)
    monkeypatch.setattr(voice_storage, "put", lambda key, data: None)

    body = {
        "texts": [{"text": "ok"}, {"text": "boom"}, {"text": "fine"}],
        "engines": ["kokoro"],
        "kind": "phrases",
    }
    r = client.post("/voice/warm", json=body).json()
    assert r == {"generated": 2, "skipped": 0}


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
