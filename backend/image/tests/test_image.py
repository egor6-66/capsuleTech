"""image service — engine registry + /image wiring (model-free).

Real generation is covered by the `*_real` test, skipped unless the matching
env flag is set (CI must not download/run diffusion weights — engine extras are
opt-in).
"""

from __future__ import annotations

import os

import pytest

from capsule_image import engine as image_engine

_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_get_engine_unknown_raises():
    with pytest.raises(ValueError, match="unknown image engine"):
        image_engine.get_engine("does-not-exist")


ALL_ENGINES = ["fake", "flux-schnell", "sdxl-turbo"]


def test_list_engines_registry():
    assert image_engine.list_engines() == ALL_ENGINES


def test_engines_endpoint(client):
    body = client.get("/image/engines").json()
    assert body["engines"] == ALL_ENGINES
    assert body["default"] == "sdxl-turbo"


def test_render_unknown_engine_400(client):
    r = client.get("/image/render", params={"prompt": "cat", "engine": "bogus"})
    assert r.status_code == 400
    assert "unknown image engine" in r.json()["detail"]


def test_render_empty_prompt_422(client):
    r = client.get("/image/render", params={"prompt": "   "})
    assert r.status_code == 422


def test_render_bad_size_422(client):
    r = client.get("/image/render", params={"prompt": "cat", "engine": "fake", "size": "huge"})
    assert r.status_code == 422


def test_render_oversize_422(client):
    r = client.get("/image/render", params={"prompt": "cat", "engine": "fake", "size": "9000x9000"})
    assert r.status_code == 422


# --- fake engine: the model-free contract guarantee ------------------------


def test_render_fake_returns_png(client):
    r = client.get("/image/render", params={"prompt": "a happy cat", "engine": "fake"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content.startswith(_PNG_MAGIC)


def test_render_fake_deterministic_by_seed(client):
    p = {"prompt": "cat", "engine": "fake", "seed": 7}
    a = client.get("/image/render", params=p).content
    b = client.get("/image/render", params={**p, "seed": 8}).content
    same = client.get("/image/render", params=p).content
    assert a == same  # same params -> same bytes
    assert a != b  # different seed -> different bytes


class _CountingEngine:
    def __init__(self, name="fake"):
        self.name = name
        self.calls = 0

    def generate(self, prompt, *, size="512x512", seed=0) -> bytes:
        self.calls += 1
        return _PNG_MAGIC + f"{prompt}|{size}|{seed}".encode()


def test_render_cache_hit_generates_once(client, monkeypatch):
    eng = _CountingEngine()
    monkeypatch.setattr(image_engine, "get_engine", lambda name=None: eng)
    r1 = client.get("/image/render", params={"prompt": "cat"})
    r2 = client.get("/image/render", params={"prompt": "cat"})
    assert r1.status_code == r2.status_code == 200
    assert r1.content == r2.content
    assert eng.calls == 1  # second request served from disk cache


def test_render_cache_headers_present(client, monkeypatch):
    monkeypatch.setattr(image_engine, "get_engine", lambda name=None: _CountingEngine())
    r = client.get("/image/render", params={"prompt": "cat"})
    assert r.headers["cache-control"] == "public, max-age=86400"
    assert r.headers["etag"].startswith('"')


def test_render_if_none_match_304_without_generation(client, monkeypatch):
    eng = _CountingEngine()
    monkeypatch.setattr(image_engine, "get_engine", lambda name=None: eng)
    etag = client.get("/image/render", params={"prompt": "cat"}).headers["etag"]
    calls_before = eng.calls
    r = client.get(
        "/image/render", params={"prompt": "cat"}, headers={"If-None-Match": etag}
    )
    assert r.status_code == 304
    assert r.headers["etag"] == etag
    assert eng.calls == calls_before  # revalidation costs no generation


def test_render_cache_varies_by_params(client, monkeypatch):
    engines = {}

    def _get(name=None):
        return engines.setdefault(name or "sdxl-turbo", _CountingEngine(name or "sdxl-turbo"))

    monkeypatch.setattr(image_engine, "get_engine", _get)
    e1 = client.get("/image/render", params={"prompt": "cat"}).headers["etag"]
    e2 = client.get("/image/render", params={"prompt": "cat", "size": "256x256"}).headers["etag"]
    e3 = client.get("/image/render", params={"prompt": "cat", "seed": 42}).headers["etag"]
    e4 = client.get("/image/render", params={"prompt": "cat", "engine": "fake"}).headers["etag"]
    assert len({e1, e2, e3, e4}) == 4
    assert engines["sdxl-turbo"].calls == 3  # base + size + seed variants
    assert engines["fake"].calls == 1


class _NotInstalledEngine:
    name = "sdxl-turbo"

    def generate(self, prompt, *, size="512x512", seed=0) -> bytes:
        raise ModuleNotFoundError("No module named 'torch'", name="torch")


def test_render_engine_not_installed_503(client, monkeypatch):
    # Registered-but-not-installed engine (lazy extras) -> actionable 503, not a raw 500.
    monkeypatch.setattr(image_engine, "get_engine", lambda name=None: _NotInstalledEngine())
    r = client.get("/image/render", params={"prompt": "cat", "engine": "sdxl-turbo"})
    assert r.status_code == 503
    assert "uv sync --extra gen" in r.json()["detail"]


# Real generation, opt-in per engine: IMAGE_REAL_ENGINES="sdxl-turbo" (or "all").
# CI never sets it — engine extras are opt-in and weights must not download there.
def _real_enabled(name: str) -> bool:
    enabled = os.getenv("IMAGE_REAL_ENGINES", "")
    return enabled == "all" or name in {e.strip() for e in enabled.split(",")}


@pytest.mark.parametrize("name", ["sdxl-turbo", "flux-schnell"])
def test_image_engine_real(name):
    if not _real_enabled(name):
        pytest.skip(f"engine {name!r} not enabled (set IMAGE_REAL_ENGINES={name} to run)")
    png = image_engine.get_engine(name).generate("a red apple", size="512x512", seed=0)
    assert png[:8] == _PNG_MAGIC
