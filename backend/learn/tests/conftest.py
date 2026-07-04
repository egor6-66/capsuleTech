"""Test fixtures — learn app with respx-mocked lang/voice upstreams."""

from __future__ import annotations

import pytest
import respx
from fastapi.testclient import TestClient

from capsule_learn.config import settings
from capsule_learn.main import app

SENSE_LIST_ITEM = {
    "id": 1,
    "text": "ice cream",
    "gloss": "frozen dessert",
    "ru": "мороженое",
    "pos": "noun",
    "level": "a1",
    "register": "neutral",
    "frequency": "high",
    "pron_ru": "айс крим",
    "connotation": "positive",
    "synset": "dessert",
    "tags": [{"name": "food", "kind": "domain"}],
}

SENSE_DETAIL = {
    "id": 1,
    "word": {"text": "ice cream", "lang": "en_US"},
    "gloss": "frozen dessert",
    "ru": "мороженое",
    "pos": "noun",
    "level": "a1",
    "register": "neutral",
    "frequency": "high",
    "source": "curated",
    "pron_ru": "айс крим",
    "ipa": None,
    "connotation": "positive",
    "intensity": None,
    "synset": "dessert",
    "nuance": None,
    "valency": None,
    "forms": {},
    "collocations": ["ice cream cone"],
    "tags": [{"name": "food", "kind": "domain"}],
    "examples": [{"text": "I love ice cream.", "pron_ru": None, "ru": None, "ipa": None}],
    "relations": [{"type": "hypernym", "target": "dessert"}],
}

RELATED = {
    "related": [
        {
            "id": 2,
            "text": "sorbet",
            "gloss": "frozen fruit dessert",
            "sharedTags": 1,
            "sameSynset": True,
            "connotation": None,
            "intensity": None,
            "synset": "dessert",
            "tags": [{"name": "food", "kind": "domain"}],
        }
    ]
}

ENGINES = {"engines": ["kokoro", "chatterbox"], "default": "kokoro"}
IMAGE_ENGINES = {"engines": ["sdxl-turbo", "fake"], "default": "sdxl-turbo"}


@pytest.fixture()
def upstream():
    with respx.mock(assert_all_called=False) as router:
        router.get(f"{settings.voice_url}/voice/engines").respond(json=ENGINES)
        router.get(f"{settings.image_url}/image/engines").respond(json=IMAGE_ENGINES)
        yield router


@pytest.fixture()
def client(upstream) -> TestClient:
    # Context-managed so lifespan runs (creates fresh httpx clients per test —
    # the voice engines cache never leaks between tests).
    with TestClient(app) as c:
        yield c
