"""Filter + detail endpoint contract (brief §Tests)."""

from __future__ import annotations

from capsule_learn.seed import seed


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_senses_filter_domain(client):
    r = client.get("/learn/lang/senses", params={"domain": "finance"})
    assert r.status_code == 200
    senses = r.json()["senses"]
    assert len(senses) == 1
    assert senses[0]["text"] == "bank"
    assert senses[0]["gloss"] == "financial institution"


def test_senses_filter_pos_adj(client):
    r = client.get("/learn/lang/senses", params={"pos": "adj"})
    texts = sorted(s["text"] for s in r.json()["senses"])
    assert texts == ["glad", "happy", "joyful"]


def test_senses_filter_tag(client):
    r = client.get("/learn/lang/senses", params={"tag": "synset-glad"})
    assert len(r.json()["senses"]) == 3


def test_senses_filter_multi_tag_and(client):
    # AND semantics: sense must carry all listed tags.
    r = client.get(
        "/learn/lang/senses",
        params=[("tag", "synset-glad"), ("tag", "emotion")],
    )
    assert len(r.json()["senses"]) == 3
    r2 = client.get(
        "/learn/lang/senses",
        params=[("tag", "synset-glad"), ("tag", "finance")],
    )
    assert r2.json()["senses"] == []


def test_sense_detail(client):
    listing = client.get("/learn/lang/senses", params={"domain": "finance"}).json()
    sid = listing["senses"][0]["id"]
    r = client.get(f"/learn/lang/sense/{sid}")
    assert r.status_code == 200
    body = r.json()
    assert body["word"] == {"text": "bank", "lang": "en_US"}
    assert body["source"] == "curated"
    tag_names = {t["name"] for t in body["tags"]}
    assert tag_names == {"finance", "institution"}


def test_sense_detail_404(client):
    assert client.get("/learn/lang/sense/99999").status_code == 404


def test_seed_idempotent(client, db):
    before = len(client.get("/learn/lang/senses").json()["senses"])
    seed(db)  # re-run
    after = len(client.get("/learn/lang/senses").json()["senses"])
    assert before == after == 5
