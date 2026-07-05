"""event journal (append-only) + internal-key gate + projections (ADR 071 D4)."""

from __future__ import annotations

from capsule_community.config import settings

DRILL = {"user_id": 1, "source_app": "learn", "kind": "drill.passed"}
KEY_HEADER = {"X-Internal-Key": "secret"}


def _batch(*events: dict) -> dict:
    return {"events": list(events)}


def test_internal_events_key_gate(make_client, monkeypatch):
    monkeypatch.setattr(settings, "internal_key", "secret")
    client = make_client(None)

    no_header = client.post("/internal/events", json=_batch(DRILL))
    assert no_header.status_code == 403

    wrong = client.post("/internal/events", headers={"X-Internal-Key": "nope"}, json=_batch(DRILL))
    assert wrong.status_code == 403

    ok = client.post("/internal/events", headers=KEY_HEADER, json=_batch(DRILL))
    assert ok.status_code == 201
    assert ok.json()["inserted"] == 1


def test_internal_events_503_without_env(make_client, monkeypatch):
    monkeypatch.setattr(settings, "internal_key", "")
    client = make_client(None)
    r = client.post("/internal/events", headers=KEY_HEADER, json=_batch(DRILL))
    assert r.status_code == 503


def test_journal_is_insert_only(client):
    # No update/delete route exists on the journal (append-only, ADR 071 D4).
    assert client.put("/internal/events").status_code in (404, 405)
    assert client.delete("/internal/events").status_code in (404, 405)


def test_stats_projection(make_client, monkeypatch):
    monkeypatch.setattr(settings, "internal_key", "secret")
    client = make_client(None)
    client.post("/internal/events", headers=KEY_HEADER, json=_batch(DRILL, DRILL, DRILL))

    r = client.get("/community/stats/1")
    assert r.status_code == 200
    body = r.json()
    assert body["total_points"] == 30  # 3 × 10 (drill.passed)
    assert body["per_app"]["learn"]["points"] == 30
    assert body["per_app"]["learn"]["drills_passed"] == 3


def test_stats_empty_for_unknown_user(client):
    r = client.get("/community/stats/777")
    assert r.status_code == 200
    assert r.json() == {"user_id": 777, "total_points": 0, "per_app": {}}


def test_leaderboard_sorted_desc(make_client, monkeypatch):
    monkeypatch.setattr(settings, "internal_key", "secret")
    client = make_client(None)
    events = [
        {"user_id": 1, "source_app": "learn", "kind": "drill.passed"},
        {"user_id": 1, "source_app": "learn", "kind": "drill.passed"},
        {"user_id": 2, "source_app": "learn", "kind": "drill.passed"},
        {"user_id": 2, "source_app": "learn", "kind": "drill.passed"},
        {"user_id": 2, "source_app": "learn", "kind": "drill.passed"},
    ]
    client.post("/internal/events", headers=KEY_HEADER, json={"events": events})

    r = client.get("/community/leaderboard", params={"app": "learn"})
    assert r.status_code == 200
    entries = r.json()["entries"]
    assert [e["user_id"] for e in entries] == [2, 1]
    assert entries[0]["points"] == 30
    assert entries[1]["points"] == 20
