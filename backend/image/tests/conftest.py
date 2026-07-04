"""Test fixtures — TestClient + an isolated disk cache per test.

The service is stateless (no DB), but /image/render caches PNGs to disk. Each
test gets its own tmp cache dir so cache-hit/miss assertions don't leak between
tests or into the real workspace.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from capsule_image.config import settings
from capsule_image.main import app


@pytest.fixture(autouse=True)
def _isolated_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "cache_dir", str(tmp_path / "images"))


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
