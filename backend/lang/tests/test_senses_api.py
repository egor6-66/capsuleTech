"""Filter + detail endpoint contract (ADR 064-A, prefix /lang per ADR 067 D2)."""

from __future__ import annotations

from capsule_lang.importer import import_file
from seed_fixture import seed


def _id_by_text(client, word: str, **params) -> int:
    senses = client.get("/lang/senses", params=params).json()["senses"]
    return next(s["id"] for s in senses if s["text"] == word)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_senses_filter_domain(client):
    senses = client.get(
        "/lang/senses", params={"domain": "finance"}
    ).json()["senses"]
    assert len(senses) == 1
    assert senses[0]["text"] == "bank"
    assert senses[0]["gloss"] == "financial institution"


def test_senses_filter_pos_adj(client):
    texts = sorted(
        s["text"]
        for s in client.get(
            "/lang/senses", params={"pos": "adj"}
        ).json()["senses"]
    )
    assert texts == ["glad", "happy", "joyful", "sad"]


def test_senses_filter_tag(client):
    senses = client.get(
        "/lang/senses", params={"tag": "emotion"}
    ).json()["senses"]
    assert {s["text"] for s in senses} == {"happy", "glad", "joyful", "sad"}


def test_senses_filter_multi_tag_and(client):
    r = client.get(
        "/lang/senses",
        params=[("tag", "emotion"), ("tag", "core")],
    ).json()["senses"]
    assert {s["text"] for s in r} == {"happy"}  # only happy carries both


def test_filter_new_facets(client):
    positive = client.get(
        "/lang/senses", params={"connotation": "positive"}
    ).json()["senses"]
    assert {s["text"] for s in positive} == {"happy", "glad", "joyful"}

    tier_core = client.get(
        "/lang/senses", params={"tier": "core"}
    ).json()["senses"]
    assert {s["text"] for s in tier_core} == {"happy"}

    synset_glad = client.get(
        "/lang/senses", params={"synset": "glad"}
    ).json()["senses"]
    assert {s["text"] for s in synset_glad} == {"happy", "glad", "joyful"}


def test_senses_q_matches_word_text_only(client):
    # q searches spelling, not the gloss/definition.
    assert {
        s["text"]
        for s in client.get("/lang/senses", params={"q": "gla"}).json()["senses"]
    } == {"glad"}
    assert (
        len(client.get("/lang/senses", params={"q": "bank"}).json()["senses"])
        == 2
    )
    # "ase" lives in glosses ("pleased"/"pleasure") but no word spelling → empty.
    assert (
        client.get("/lang/senses", params={"q": "ase"}).json()["senses"] == []
    )


def test_senses_q_cyrillic_searches_ru_translation(client, db, tmp_path):
    # `ru` is a dedicated translation column, separate from the (English)
    # `gloss` — Cyrillic q must search it instead of the (Latin) spelling.
    p = tmp_path / "ru.yml"
    p.write_text(
        "\n".join(
            [
                "- word: many",
                "  pos: adverb",
                '  gloss: "a large number of"',
                '  ru: "много"',
                "- word: always",
                "  pos: adverb",
                '  gloss: "at all times"',
                '  ru: "всегда"',
            ]
        ),
        encoding="utf-8",
    )
    import_file(p, db=db)

    hits = client.get("/lang/senses", params={"q": "мног"}).json()["senses"]
    assert {s["text"] for s in hits} == {"many"}
    # capitalised Cyrillic query still matches the lowercase ru (SQLite
    # lower() folds ASCII only → the pattern is pre-lowered in repo).
    hits = client.get("/lang/senses", params={"q": "Всегда"}).json()["senses"]
    assert {s["text"] for s in hits} == {"always"}
    # Latin queries untouched: spelling-only, ru/gloss are not searched.
    assert client.get("/lang/senses", params={"q": "ase"}).json()["senses"] == []


def test_senses_q_cross_lingual_translation(client):
    # The exact user-facing case: know the English spelling ("hap") OR know
    # the Russian meaning ("счастливый") — both must resolve to "happy".
    by_spelling = client.get("/lang/senses", params={"q": "hap"}).json()["senses"]
    assert {s["text"] for s in by_spelling} == {"happy"}

    by_translation = client.get(
        "/lang/senses", params={"q": "счастливый"}
    ).json()["senses"]
    assert {s["text"] for s in by_translation} == {"happy"}
    assert by_translation[0]["ru"] == "счастливый"


def test_sense_detail_rich(client):
    sid = _id_by_text(client, "happy", pos="adj")
    body = client.get(f"/lang/sense/{sid}").json()
    assert body["word"] == {"text": "happy", "lang": "en_US"}
    assert body["pron_ru"] == "хэпи"
    assert body["image"]
    assert body["connotation"] == "positive"
    assert body["intensity"] == 2
    assert body["synset"] == "glad"
    assert body["forms"] == {"comparative": "happier", "superlative": "happiest"}
    assert "happy with" in body["collocations"]
    assert body["examples"][0]["pron_ru"] == "айм хэпи уиз ит"
    assert body["relations"] == [{"type": "antonym", "target": "sad (not happy)"}]


def test_sense_detail_404(client):
    assert client.get("/lang/sense/99999").status_code == 404


def test_seed_idempotent(client, db):
    before = len(client.get("/lang/senses").json()["senses"])
    report = seed(db)  # re-run
    after = len(client.get("/lang/senses").json()["senses"])
    assert before == after == 6
    assert report.imported == 0  # all already present
    assert report.updated == 6
