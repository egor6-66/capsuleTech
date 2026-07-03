"""Test fixtures — plain TestClient; the service is stateless (no DB)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from capsule_voice.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
