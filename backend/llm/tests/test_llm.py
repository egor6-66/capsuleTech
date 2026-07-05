"""llm service — engine registry + /llm wiring (model-free).

Real inference is covered by the `*_real` test, skipped unless the matching env
flag is set (CI must not download/run GGUF weights — the `gen` extra is opt-in).
"""

from __future__ import annotations

import json
import os

import pytest

from capsule_llm import engine as llm_engine
from capsule_llm.config import settings

ALL_ENGINES = ["fake", "llama-cpp"]


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


# --- registry --------------------------------------------------------------


def test_get_engine_unknown_raises():
    with pytest.raises(ValueError, match="unknown llm engine"):
        llm_engine.get_engine("does-not-exist")


def test_list_engines_registry():
    assert llm_engine.list_engines() == ALL_ENGINES


def test_engines_endpoint(client):
    body = client.get("/llm/engines").json()
    assert body["engines"] == ALL_ENGINES
    assert body["default"] == "llama-cpp"


# --- error branches --------------------------------------------------------


def test_generate_unknown_engine_400(client):
    r = client.post("/llm/generate", json={"prompt": "hi", "engine": "bogus"})
    assert r.status_code == 400
    assert "unknown llm engine" in r.json()["detail"]


def test_generate_empty_prompt_422(client):
    r = client.post("/llm/generate", json={"prompt": "   "})
    assert r.status_code == 422


def test_generate_bad_max_tokens_422(client):
    r = client.post("/llm/generate", json={"prompt": "hi", "engine": "fake", "max_tokens": 0})
    assert r.status_code == 422


def test_generate_bad_temperature_422(client):
    r = client.post("/llm/generate", json={"prompt": "hi", "engine": "fake", "temperature": 5})
    assert r.status_code == 422


# --- fake engine: the model-free contract guarantee ------------------------


def test_generate_fake_returns_text(client):
    r = client.post("/llm/generate", json={"prompt": "say hi", "engine": "fake"})
    assert r.status_code == 200
    body = r.json()
    assert "text" in body and "json" not in body
    assert "say hi" in body["text"]


def test_generate_fake_deterministic(client):
    p = {"prompt": "same prompt", "engine": "fake"}
    a = client.post("/llm/generate", json=p).json()
    b = client.post("/llm/generate", json=p).json()
    assert a == b


def test_generate_fake_schema_returns_valid_json(client):
    schema = {
        "type": "object",
        "required": ["verdict", "score", "reasons"],
        "properties": {
            "verdict": {"type": "string", "enum": ["pass", "fail"]},
            "score": {"type": "integer"},
            "reasons": {"type": "array", "items": {"type": "string"}},
        },
    }
    r = client.post(
        "/llm/generate", json={"prompt": "judge this", "engine": "fake", "schema": schema}
    )
    assert r.status_code == 200
    body = r.json()
    assert "json" in body and "text" not in body
    obj = body["json"]
    # minimal-but-valid: required keys present, enum picks the first option.
    assert set(obj) == {"verdict", "score", "reasons"}
    assert obj["verdict"] == "pass"
    assert obj["score"] == 0
    assert obj["reasons"] == []
    # round-trips as JSON (it came back parsed, but assert the shape holds)
    assert json.loads(json.dumps(obj)) == obj


# --- llama-cpp: 503 without configured weights -----------------------------


def test_generate_llama_cpp_unconfigured_503(client, monkeypatch):
    # No LLM_MODEL_PATH => registered engine, but air-gapped weights not supplied.
    monkeypatch.setattr(settings, "llm_model_path", None)
    r = client.post("/llm/generate", json={"prompt": "hi", "engine": "llama-cpp"})
    assert r.status_code == 503
    assert "model not configured" in r.json()["detail"]


class _NotInstalledEngine:
    name = "llama-cpp"

    def generate(self, prompt, *, system=None, schema=None, max_tokens=512, temperature=0.2) -> str:
        raise ModuleNotFoundError("No module named 'llama_cpp'", name="llama_cpp")


def test_generate_engine_not_installed_503(client, monkeypatch):
    # Registered-but-not-installed engine (lazy extra) -> actionable 503, not 500.
    monkeypatch.setattr(llm_engine, "get_engine", lambda name=None: _NotInstalledEngine())
    r = client.post("/llm/generate", json={"prompt": "hi", "engine": "llama-cpp"})
    assert r.status_code == 503
    assert "uv sync --extra gen" in r.json()["detail"]


class _BadJsonEngine:
    name = "fake"

    def generate(self, prompt, *, system=None, schema=None, max_tokens=512, temperature=0.2) -> str:
        return "not json{"


def test_generate_schema_invalid_json_502(client, monkeypatch):
    # Defensive: if an engine breaks its JSON guarantee, surface 502, not garbage.
    monkeypatch.setattr(llm_engine, "get_engine", lambda name=None: _BadJsonEngine())
    r = client.post("/llm/generate", json={"prompt": "hi", "schema": {"type": "object"}})
    assert r.status_code == 502
    assert "invalid JSON" in r.json()["detail"]


# Real inference, opt-in: LLM_REAL=1 with LLM_MODEL_PATH set to a local GGUF.
# CI never sets it — the `gen` extra is opt-in and weights must not download there.
def test_generate_llama_cpp_real():
    if os.getenv("LLM_REAL") != "1":
        pytest.skip("real llama-cpp disabled (set LLM_REAL=1 + LLM_MODEL_PATH to run)")
    text = llm_engine.get_engine("llama-cpp").generate(
        "Reply with the single word: ready", max_tokens=16
    )
    assert isinstance(text, str) and text.strip()
