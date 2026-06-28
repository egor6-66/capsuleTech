"""Related-by-shared-tags ranking (brief §Tests)."""

from __future__ import annotations


def _sense_id(client, word: str) -> int:
    senses = client.get("/learn/lang/senses", params={"pos": "adj"}).json()["senses"]
    return next(s["id"] for s in senses if s["text"] == word)


def test_related_happy(client):
    happy = _sense_id(client, "happy")
    r = client.get("/learn/lang/senses/related", params={"sense": happy})
    assert r.status_code == 200
    related = r.json()["related"]
    texts = {x["text"] for x in related}
    assert texts == {"glad", "joyful"}
    # happy shares synset-glad + emotion (2 tags) with each.
    assert all(x["sharedTags"] == 2 for x in related)


def test_related_excludes_self(client):
    happy = _sense_id(client, "happy")
    related = client.get(
        "/learn/lang/senses/related", params={"sense": happy}
    ).json()["related"]
    assert all(x["id"] != happy for x in related)


def test_related_context_weight(client):
    happy = _sense_id(client, "happy")
    r = client.get(
        "/learn/lang/senses/related",
        params={"sense": happy, "context": "emotion"},
    )
    related = r.json()["related"]
    # All carry the emotion context tag → still both returned.
    assert {x["text"] for x in related} == {"glad", "joyful"}


def test_related_empty_for_unknown(client):
    r = client.get("/learn/lang/senses/related", params={"sense": 99999})
    assert r.status_code == 200
    assert r.json()["related"] == []
