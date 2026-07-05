"""Concepts/rules composer — passthrough lists/detail + rule-with-drills.

Concepts and the rule index/body are lang-owned content, forwarded verbatim.
A rule's detail composes its drills through the SAME lesson mechanics (items
sanitized to strip the answer key + `words_resolved` enrichment). Mocks the
lang upstream + per-word sense lookups; voice/image engines come from the
shared `upstream` fixture. No live services needed.
"""

from __future__ import annotations

import httpx

from capsule_learn.config import settings
from conftest import ENGINES

CONCEPT_LIST = {
    "concepts": [
        {"id": "word-as-image", "title": "Слово-образ", "principle": "Учи слово",
         "tags": ["philosophy"]},
    ]
}

CONCEPT_DETAIL = {
    "id": "word-as-image",
    "title": "Слово-образ",
    "principle": "Учи слово как образ",
    "body": "# markdown тело",
    "tags": ["philosophy"],
    "examples": ["пример"],
    "relatedRules": ["grammar-pronouns"],
    "relatedConcepts": [],
}

RULE_LIST = {
    "rules": [
        {"id": "grammar-pronouns", "title": "Местоимения", "tags": ["grammar"]},
    ]
}

RULE_DETAIL = {
    "id": "grammar-pronouns",
    "title": "Местоимения",
    "body": "# тело правила",
    "tags": ["grammar"],
}

DRILLS_BY_RULE = {
    "drills": [{
        "id": "subject-object-pronouns",
        "title": "Subject vs object",
        "level": "l2",
        "dimension": "form",
        "tags": ["grammar"],
        "rule": "grammar-pronouns",
        "graboTag": "subject-object-pronouns",
        # "come" over-matches "become" upstream; "ghost" resolves to nothing.
        "words": ["eat", "come", "ghost"],
        "concepts": ["word-as-image"],
        "items": [{"promptRu": "Я вижу его.", "context": None, "answerEn": "I see him.",
                   "accept": [], "nearMiss": [], "graboTag": None}],
    }]
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


def _mock_rule_detail(upstream, drills=DRILLS_BY_RULE):
    upstream.get(f"{settings.lang_url}/lang/rules/grammar-pronouns").respond(json=RULE_DETAIL)
    upstream.get(f"{settings.lang_url}/lang/drills").respond(json=drills)
    upstream.get(f"{settings.lang_url}/lang/senses").mock(side_effect=_senses_side_effect)


# --- lists / concept detail: pure passthrough --------------------------------


def test_list_concepts_passthrough(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/concepts").respond(json=CONCEPT_LIST)
    resp = client.get("/learn/concepts")
    assert resp.status_code == 200
    assert resp.json() == CONCEPT_LIST


def test_concept_detail_passthrough(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/concepts/word-as-image").respond(json=CONCEPT_DETAIL)
    resp = client.get("/learn/concepts/word-as-image")
    assert resp.status_code == 200
    # Full body (incl. markdown + relations) survives verbatim.
    assert resp.json() == CONCEPT_DETAIL


def test_list_rules_passthrough(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/rules").respond(json=RULE_LIST)
    resp = client.get("/learn/rules")
    assert resp.status_code == 200
    assert resp.json() == RULE_LIST


# --- rule detail: body verbatim + composed drills ----------------------------


def test_rule_detail_body_verbatim(upstream, client):
    _mock_rule_detail(upstream)
    body = client.get("/learn/rules/grammar-pronouns").json()
    # Rule body forwarded as-is, drills grafted on alongside.
    assert body["id"] == "grammar-pronouns"
    assert body["title"] == "Местоимения"
    assert body["body"] == "# тело правила"
    assert body["tags"] == ["grammar"]
    assert [d["id"] for d in body["drills"]] == ["subject-object-pronouns"]
    assert body["drills"][0]["words"] == ["eat", "come", "ghost"]  # raw list untouched


def test_rule_drill_items_sanitized_no_answer_key(upstream, client):
    # Same mechanics as a lesson: the answer key never reaches the browser.
    _mock_rule_detail(upstream)
    body = client.get("/learn/rules/grammar-pronouns").json()
    item = body["drills"][0]["items"][0]
    assert item == {"index": 0, "promptRu": "Я вижу его.", "context": None}
    assert "answerEn" not in item
    assert "accept" not in item
    assert "nearMiss" not in item
    assert "graboTag" not in item


def test_rule_drill_words_resolved_enrichment(upstream, client):
    _mock_rule_detail(upstream)
    body = client.get("/learn/rules/grammar-pronouns").json()
    resolved = body["drills"][0]["words_resolved"]
    assert [w["text"] for w in resolved] == ["eat", "come", "ghost"]

    eat = resolved[0]
    assert eat["senseId"] == 10
    assert eat["ru"] == "есть"
    assert eat["pron_ru"] == "ит"
    assert eat["pos"] == "verb"
    assert eat["audio"]["url"].endswith("?engine=kokoro&kind=words&text=eat&lang=en_US")
    assert eat["audio"]["engines"] == ENGINES["engines"]
    assert "image/render?prompt=eat+%28verb%29" in eat["image"]["url"]

    # over-match guard: "come" resolves to the exact headword, not "become".
    come = resolved[1]
    assert come["senseId"] == 21
    assert come["ru"] == "приходить"

    # unresolved word rides with audio only (voice up), image needs a pos.
    ghost = resolved[2]
    assert ghost["senseId"] is None
    assert ghost["image"] is None
    assert ghost["audio"]["url"].endswith("?engine=kokoro&kind=words&text=ghost&lang=en_US")


def test_rule_without_drills_empty_list(upstream, client):
    # A rule with no drills is a valid answer — empty list, body still intact.
    _mock_rule_detail(upstream, drills={"drills": []})
    body = client.get("/learn/rules/grammar-pronouns").json()
    assert body["body"] == "# тело правила"
    assert body["drills"] == []


# --- error mapping -----------------------------------------------------------


def test_rule_404_maps_to_404(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/rules/nope").respond(
        status_code=404, json={"detail": "rule not found"}
    )
    resp = client.get("/learn/rules/nope")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "rule not found"


def test_lang_down_maps_to_502(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/rules").mock(
        side_effect=httpx.ConnectError("refused")
    )
    resp = client.get("/learn/rules")
    assert resp.status_code == 502
    assert "lang unavailable" in resp.json()["detail"]
