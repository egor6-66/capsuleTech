"""register/login/logout/me contract (ADR 068 D2/D3, prefix /auth)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from capsule_auth.models import User, UserSession


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_sets_cookie(client):
    r = client.post("/auth/register", json={"login": "alice", "password": "hunter22"})
    assert r.status_code == 201
    body = r.json()
    assert body["login"] == "alice"
    assert body["role"] == "member"
    assert "capsule_session" in r.cookies


def test_register_duplicate_login_409(client):
    client.post("/auth/register", json={"login": "alice", "password": "hunter22"})
    r = client.post("/auth/register", json={"login": "alice", "password": "different1"})
    assert r.status_code == 409


def test_login_correct_and_wrong_password(client):
    client.post("/auth/register", json={"login": "bob", "password": "hunter22"})
    ok = client.post("/auth/login", json={"login": "bob", "password": "hunter22"})
    assert ok.status_code == 200
    bad = client.post("/auth/login", json={"login": "bob", "password": "wrongpass"})
    assert bad.status_code == 401


def test_me_requires_cookie(client):
    client.post("/auth/register", json={"login": "carol", "password": "hunter22"})
    client.cookies.clear()
    assert client.get("/auth/me").status_code == 401

    client.post("/auth/login", json={"login": "carol", "password": "hunter22"})
    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["login"] == "carol"


def test_logout_revokes_session(client):
    client.post("/auth/register", json={"login": "dave", "password": "hunter22"})
    assert client.get("/auth/me").status_code == 200

    r = client.post("/auth/logout")
    assert r.status_code == 204

    assert client.get("/auth/me").status_code == 401


def test_logout_without_cookie_is_idempotent(client):
    client.cookies.clear()
    r = client.post("/auth/logout")
    assert r.status_code == 204


def test_expired_session_rejected_and_row_deleted(client, db):
    client.post("/auth/register", json={"login": "erin", "password": "hunter22"})
    sess = db.query(UserSession).one()
    sess.expires_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1)
    db.commit()

    r = client.get("/auth/me")
    assert r.status_code == 401
    assert db.query(UserSession).count() == 0


def test_no_raw_secrets_stored(client, db):
    client.post("/auth/register", json={"login": "frank", "password": "hunter22"})
    user = db.query(User).filter_by(login="frank").one()
    identity = user.identities[0]
    assert identity.secret_hash != "hunter22"

    session = db.query(UserSession).one()
    assert len(session.token_hash) == 64  # sha256 hex digest, not the raw token
