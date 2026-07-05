"""Lessons composer — passthrough of lang content + drill-word enrichment.

Mocks the lang upstream (lessons + per-word sense lookups); voice/image engines
come from the shared `upstream` fixture. No live services needed.
"""

from __future__ import annotations

import httpx

from capsule_learn.config import settings
from conftest import ENGINES

LESSON_LIST = {
    "lessons": [
        {"id": "past-perfect", "title": "Past Perfect", "level": "l3",
         "tags": ["grammar", "past-perfect"]},
    ]
}

LESSON_DETAIL = {
    "id": "past-perfect",
    "title": "Past Perfect",
    "level": "l3",
    "tags": ["grammar"],
    "intro": "Проза урока.",
    "concepts": [{"id": "word-as-image", "title": "Слово-образ", "principle": "Учи слово",
                  "body": "# markdown", "tags": [], "examples": [],
                  "relatedRules": ["grammar-verbs-tenses"], "relatedConcepts": []}],
    "rules": [{"id": "grammar-verbs-tenses", "title": "Времена", "body": "# body", "tags": []}],
    "drills": [{
        "id": "past-perfect-which-clause",
        "title": "Which clause",
        "level": "l3",
        "tags": ["grammar"],
        "rule": "grammar-verbs-tenses",
        "graboTag": "past-perfect-which-clause",
        # "come" over-matches "become" upstream; "ghost" resolves to nothing.
        "words": ["eat", "come", "ghost"],
        "concepts": ["word-as-image"],
        "items": [{"promptRu": "Я уже поел.", "context": None, "answerEn": "I had eaten.",
                   "accept": [], "nearMiss": [], "graboTag": None}],
    }],
}

# Sense-list rows keyed by the `q` the resolver sends. "come" returns an
# over-match ("become") alongside the exact row to prove the exact-match guard.
SENSES_BY_WORD = {
    "eat": [{"id": 10, "text": "eat", "gloss": "consume food", "ru": "есть",
             "pos": "verb", "pron_ru": "ит", "level": "a1", "register": "neutral",
             "frequency": "high", "connotation": None, "synset": None, "tags": []}],
    "come": [
        {"id": 20, "text": "become", "gloss": "turn into", "ru": "становиться",
         "pos": "verb", "pron_ru": "бикам", "level": "a2", "register": "neutral",
         "frequency": "high", "connotation": None, "synset": None, "tags": []},
        {"id": 21, "text": "come", "gloss": "move toward", "ru": "приходить",
         "pos": "verb", "pron_ru": "кам", "level": "a1", "register": "neutral",
         "frequency": "high", "connotation": None, "synset": None, "tags": []},
    ],
    "ghost": [],
}


def _senses_side_effect(request: httpx.Request) -> httpx.Response:
    q = request.url.params.get("q", "")
    return httpx.Response(200, json={"senses": SENSES_BY_WORD.get(q, [])})


def _mock_lang_detail(upstream):
    upstream.get(f"{settings.lang_url}/lang/lessons/past-perfect").respond(json=LESSON_DETAIL)
    upstream.get(f"{settings.lang_url}/lang/senses").mock(side_effect=_senses_side_effect)


def test_list_lessons_passthrough(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/lessons").respond(json=LESSON_LIST)
    resp = client.get("/learn/lessons")
    assert resp.status_code == 200
    assert resp.json() == LESSON_LIST


def test_lesson_detail_passthrough_content(upstream, client):
    _mock_lang_detail(upstream)
    body = client.get("/learn/lessons/past-perfect").json()
    # lang-owned content survives verbatim (concepts/rules/intro/order).
    assert body["intro"] == "Проза урока."
    assert [c["id"] for c in body["concepts"]] == ["word-as-image"]
    assert body["concepts"][0]["body"] == "# markdown"
    assert [r["id"] for r in body["rules"]] == ["grammar-verbs-tenses"]
    drill = body["drills"][0]
    assert drill["rule"] == "grammar-verbs-tenses"
    assert drill["words"] == ["eat", "come", "ghost"]  # raw list untouched


def test_lesson_items_sanitized_no_answer_key(upstream, client):
    # The answer key never reaches the browser: items are scrubbed down to
    # {index, promptRu, context}. Grading happens via POST .../check.
    _mock_lang_detail(upstream)
    body = client.get("/learn/lessons/past-perfect").json()
    item = body["drills"][0]["items"][0]
    assert item == {"index": 0, "promptRu": "Я уже поел.", "context": None}
    assert "answerEn" not in item
    assert "accept" not in item
    assert "nearMiss" not in item
    assert "graboTag" not in item


def test_words_resolved_enrichment(upstream, client):
    _mock_lang_detail(upstream)
    body = client.get("/learn/lessons/past-perfect").json()
    resolved = body["drills"][0]["words_resolved"]
    # One entry per word, order preserved.
    assert [w["text"] for w in resolved] == ["eat", "come", "ghost"]

    eat = resolved[0]
    assert eat["senseId"] == 10
    assert eat["ru"] == "есть"
    assert eat["pron_ru"] == "ит"
    assert eat["pos"] == "verb"
    assert eat["audio"]["url"].endswith("/voice/speak?text=eat&lang=en_US")
    assert eat["audio"]["engines"] == ENGINES["engines"]
    assert "image/render?prompt=eat+%28verb%29" in eat["image"]["url"]

    # over-match guard: "come" resolves to the exact headword, not "become".
    come = resolved[1]
    assert come["senseId"] == 21
    assert come["ru"] == "приходить"


def test_unresolved_word_rides_with_audio_only(upstream, client):
    _mock_lang_detail(upstream)
    body = client.get("/learn/lessons/past-perfect").json()
    ghost = body["drills"][0]["words_resolved"][2]
    assert ghost["text"] == "ghost"
    assert ghost["senseId"] is None
    assert ghost["ru"] is None
    assert ghost["pos"] is None
    # audio rides on the text alone (voice up); image needs a resolved pos.
    assert ghost["audio"]["url"].endswith("/voice/speak?text=ghost&lang=en_US")
    assert ghost["image"] is None


def test_voice_and_image_down_degrade_to_null():
    # A dedicated scope + fresh client: voice/image engines unreachable, so the
    # per-client engine cache probes them for the first time and gets None.
    import respx
    from fastapi.testclient import TestClient

    from capsule_learn.main import app

    with respx.mock(assert_all_called=False) as upstream:
        _mock_lang_detail(upstream)
        upstream.get(f"{settings.voice_url}/voice/engines").mock(
            side_effect=httpx.ConnectError("down")
        )
        upstream.get(f"{settings.image_url}/image/engines").mock(
            side_effect=httpx.ConnectError("down")
        )
        with TestClient(app) as c:
            body = c.get("/learn/lessons/past-perfect").json()
    eat = body["drills"][0]["words_resolved"][0]
    assert eat["senseId"] == 10  # sense still resolved from lang
    assert eat["audio"] is None
    assert eat["image"] is None


def test_lesson_404_maps_to_404(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/lessons/nope").respond(
        status_code=404, json={"detail": "lesson not found"}
    )
    resp = client.get("/learn/lessons/nope")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "lesson not found"


def test_lang_down_maps_to_502(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/lessons").mock(
        side_effect=httpx.ConnectError("refused")
    )
    resp = client.get("/learn/lessons")
    assert resp.status_code == 502
    assert "lang unavailable" in resp.json()["detail"]
