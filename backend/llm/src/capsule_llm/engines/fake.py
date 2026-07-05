"""Fake LLM engine — deterministic, no inference stack.

The contract guarantee for CI: registry + /llm wiring + schema handling are
tested without downloading gigabytes of GGUF weights. Free-form generation echoes
a deterministic template of the prompt; schema-constrained generation returns a
minimal JSON object that validates against the given JSON Schema. Pure stdlib.
"""

from __future__ import annotations

import json
from typing import Any


def _minimal_instance(schema: dict[str, Any] | Any) -> Any:
    """Smallest value that satisfies `schema` (a JSON-Schema fragment).

    Deterministic and total — unknown/empty schemas yield None. Enough to make
    the fake engine's schema output parse and carry the required keys, which is
    all the CI contract needs (real conformance is the model's job, not the fake).
    """
    if not isinstance(schema, dict):
        return None
    if "const" in schema:
        return schema["const"]
    if "default" in schema:
        return schema["default"]
    if schema.get("enum"):
        return schema["enum"][0]

    typ = schema.get("type")
    if isinstance(typ, list):
        typ = typ[0] if typ else None

    if typ == "object" or (typ is None and "properties" in schema):
        props = schema.get("properties", {})
        required = schema.get("required")
        keys = required if required is not None else list(props.keys())
        return {k: _minimal_instance(props.get(k, {})) for k in keys}
    if typ == "array":
        items = schema.get("items", {})
        if isinstance(items, list):  # tuple validation
            return [_minimal_instance(s) for s in items]
        return [_minimal_instance(items) for _ in range(schema.get("minItems", 0))]
    if typ == "string":
        return ""
    if typ == "integer":
        return 0
    if typ == "number":
        return 0
    if typ == "boolean":
        return False
    # "null" or unspecified
    return None


class FakeEngine:
    name = "fake"

    def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        schema: dict[str, Any] | None = None,
        max_tokens: int = 512,
        temperature: float = 0.2,
    ) -> str:
        if schema is not None:
            return json.dumps(_minimal_instance(schema))
        return f"[fake] {prompt.strip()}"
