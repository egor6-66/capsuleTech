"""POST /learn/drills/{id}/check + lesson-output sanitization (ADR 069 ф.2).

Mocks the lang `/lang/drills/{id}` upstream — the answer key lives there and is
graded server-side. Verdict logic itself is covered in test_checker; here we
assert the wiring (fetch → grade → shape) and the 404 paths.
"""

from __future__ import annotations

import httpx

from capsule_learn.config import settings

DRILL = {
    "id": "past-perfect-which-clause",
    "title": "Which clause",
    "level": "l3",
    "tags": ["grammar"],
    "rule": "grammar-verbs-tenses",
    "graboTag": "past-perfect-which-clause",
    "words": ["eat", "call"],
    "concepts": ["word-as-image"],
    "items": [
        {"promptRu": "Я уже поел, когда он позвонил.", "context": None,
         "answerEn": "I had already eaten when he called.",
         "accept": ["I'd already eaten when he called.",
                    "I had eaten when he called."],
         "nearMiss": [
             {"match": "contains", "pattern": "did eat",
              "hint": "Это Past Perfect, а не Past Simple."},
             {"match": "regex", "pattern": r"had( already)? eat(ed)?\b",
              "hint": "Причастие — eaten."},
         ],
         "graboTag": None},
    ],
}

_URL = f"{settings.lang_url}/lang/drills/past-perfect-which-clause"


def test_check_correct(upstream, client):
    upstream.get(_URL).respond(json=DRILL)
    resp = client.post(
        "/learn/drills/past-perfect-which-clause/check",
        json={"item_index": 0, "answer": "I'd already eaten when he called."},
    )
    assert resp.status_code == 200
    # exclude_none — a bare correct verdict carries no hint/answer keys.
    assert resp.json() == {"verdict": "correct"}


def test_check_near_miss_returns_hint(upstream, client):
    upstream.get(_URL).respond(json=DRILL)
    body = client.post(
        "/learn/drills/past-perfect-which-clause/check",
        json={"item_index": 0, "answer": "I did eat when he called"},
    ).json()
    assert body["verdict"] == "near_miss"
    assert "Past Perfect" in body["hint"]
    assert "answer" not in body  # no reveal → no answer key


def test_check_wrong(upstream, client):
    upstream.get(_URL).respond(json=DRILL)
    body = client.post(
        "/learn/drills/past-perfect-which-clause/check",
        json={"item_index": 0, "answer": "no idea"},
    ).json()
    assert body == {"verdict": "wrong"}


def test_check_reveal_echoes_answer(upstream, client):
    upstream.get(_URL).respond(json=DRILL)
    body = client.post(
        "/learn/drills/past-perfect-which-clause/check",
        json={"item_index": 0, "answer": "no idea", "reveal": True},
    ).json()
    assert body["verdict"] == "wrong"
    assert body["answer"] == "I had already eaten when he called."


def test_check_unknown_drill_404(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/drills/nope").respond(
        status_code=404, json={"detail": "drill not found"}
    )
    resp = client.post(
        "/learn/drills/nope/check", json={"item_index": 0, "answer": "x"}
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "drill not found"


def test_check_item_index_out_of_range_404(upstream, client):
    upstream.get(_URL).respond(json=DRILL)
    resp = client.post(
        "/learn/drills/past-perfect-which-clause/check",
        json={"item_index": 5, "answer": "x"},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "drill item not found"


def test_check_lang_down_502(upstream, client):
    upstream.get(_URL).mock(side_effect=httpx.ConnectError("refused"))
    resp = client.post(
        "/learn/drills/past-perfect-which-clause/check",
        json={"item_index": 0, "answer": "x"},
    )
    assert resp.status_code == 502
    assert "lang unavailable" in resp.json()["detail"]
