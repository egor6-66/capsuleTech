"""Test fixtures — TestClient over the stateless llm service.

No DB, no cache to isolate (unlike image) — the service just generates.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from capsule_llm.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
