"""Synset-aware related ranking (brief §Tests, ADR 064-A)."""

from __future__ import annotations


def _id_by_text(client, word: str) -> int:
    senses = client.get("/learn/lang/senses", params={"pos": "adj"}).json()["senses"]
    return next(s["id"] for s in senses if s["text"] == word)


def test_related_happy(client):
    happy = _id_by_text(client, "happy")
    related = client.get(
        "/learn/lang/senses/related", params={"sense": happy}
    ).json()["related"]
    # glad/joyful share synset+tag; sad shares only the emotion tag.
    assert {x["text"] for x in related} == {"glad", "joyful", "sad"}


def test_related_synset_first(client):
    happy = _id_by_text(client, "happy")
    related = client.get(
        "/learn/lang/senses/related", params={"sense": happy}
    ).json()["related"]
    order = [x["text"] for x in related]
    # same-synset (glad, joyful) must rank before the different-synset sad.
    assert order.index("glad") < order.index("sad")
    assert order.index("joyful") < order.index("sad")
    by_text = {x["text"]: x for x in related}
    assert by_text["glad"]["sameSynset"] is True
    assert by_text["joyful"]["sameSynset"] is True
    assert by_text["sad"]["sameSynset"] is False
    # swap-UI payload present
    assert by_text["glad"]["connotation"] == "positive"
    assert by_text["glad"]["intensity"] == 1


def test_related_excludes_self(client):
    happy = _id_by_text(client, "happy")
    related = client.get(
        "/learn/lang/senses/related", params={"sense": happy}
    ).json()["related"]
    assert all(x["id"] != happy for x in related)


def test_related_empty_for_unknown(client):
    r = client.get("/learn/lang/senses/related", params={"sense": 99999})
    assert r.status_code == 200
    assert r.json()["related"] == []
