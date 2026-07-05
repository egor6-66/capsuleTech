"""profile CRUD + auto-create + avatar 503/mock (ADR 071 D3)."""

from __future__ import annotations

from capsule_community import storage
from capsule_community.clients.auth import AuthUser

ALICE = AuthUser(id=1, login="alice", role="member")
BOB = AuthUser(id=2, login="bob", role="member")


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_get_profile_autocreates(make_client):
    client = make_client(ALICE)
    r = client.get("/community/profile")
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == 1
    assert body["nick"] == "alice"  # default nick = auth login
    assert body["avatar_url"] is None
    assert body["contacts"] == {}


def test_get_profile_requires_member(client):
    # guest session (make_client(None)) → 401 on the member endpoint
    assert client.get("/community/profile").status_code == 401


def test_put_profile_updates_fields(make_client):
    client = make_client(ALICE)
    r = client.put(
        "/community/profile",
        json={"nick": "alice2", "bio": "hi there", "contacts": {"tg": "@alice"}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["nick"] == "alice2"
    assert body["bio"] == "hi there"
    assert body["contacts"] == {"tg": "@alice"}


def test_put_nick_conflict_409(make_client):
    make_client(ALICE).put("/community/profile", json={"nick": "shared"})
    r = make_client(BOB).put("/community/profile", json={"nick": "shared"})
    assert r.status_code == 409


def test_get_profile_by_id_public_and_404(make_client, client):
    make_client(ALICE).get("/community/profile")  # auto-create alice
    ok = client.get("/community/profiles/1")
    assert ok.status_code == 200
    assert ok.json()["nick"] == "alice"
    assert client.get("/community/profiles/999").status_code == 404


def test_members_list_public(make_client, client):
    make_client(ALICE).get("/community/profile")
    make_client(BOB).get("/community/profile")
    r = client.get("/community/members")
    assert r.status_code == 200
    nicks = {m["nick"] for m in r.json()}
    assert {"alice", "bob"} <= nicks


def test_avatar_503_without_storage(make_client):
    client = make_client(ALICE)
    r = client.post(
        "/community/profile/avatar",
        files={"file": ("a.png", b"bytes", "image/png")},
    )
    assert r.status_code == 503


def test_avatar_happy_path_mocked_s3(make_client, monkeypatch):
    monkeypatch.setattr(storage, "storage_configured", lambda: True)
    monkeypatch.setattr(storage, "put_avatar", lambda **kw: f"{kw['user_id']}.png")
    client = make_client(ALICE)
    r = client.post(
        "/community/profile/avatar",
        files={"file": ("a.png", b"bytes", "image/png")},
    )
    assert r.status_code == 200
    assert r.json()["avatar_url"] == "/media/avatars/1.png"


def test_avatar_rejects_bad_type(make_client, monkeypatch):
    monkeypatch.setattr(storage, "storage_configured", lambda: True)
    client = make_client(ALICE)
    r = client.post(
        "/community/profile/avatar",
        files={"file": ("a.gif", b"bytes", "image/gif")},
    )
    assert r.status_code == 415
