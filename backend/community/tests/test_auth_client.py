"""auth-passthrough client — member / guest / revocation (ADR 071 D2, mocked httpx)."""

from __future__ import annotations

import httpx

from capsule_community.clients.auth import AuthClient


def _client(handler) -> AuthClient:
    return AuthClient("http://auth", transport=httpx.MockTransport(handler))


async def test_resolve_member():
    def handler(_req: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"id": 1, "login": "alice", "role": "member"})

    client = _client(handler)
    user = await client.resolve("capsule_session=tok")
    assert user is not None
    assert (user.id, user.login, user.role) == (1, "alice", "member")
    await client.aclose()


async def test_resolve_no_cookie_is_guest():
    def handler(_req: httpx.Request) -> httpx.Response:  # pragma: no cover - must not run
        return httpx.Response(200, json={"id": 1, "login": "x", "role": "member"})

    client = _client(handler)
    assert await client.resolve(None) is None
    await client.aclose()


async def test_resolve_revoked_401_is_guest():
    def handler(_req: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": "not authenticated"})

    client = _client(handler)
    assert await client.resolve("capsule_session=stale") is None
    await client.aclose()


async def test_resolve_passes_cookie_through():
    seen: dict[str, str | None] = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["cookie"] = req.headers.get("cookie")
        return httpx.Response(200, json={"id": 2, "login": "bob", "role": "member"})

    client = _client(handler)
    await client.resolve("capsule_session=abc123")
    assert seen["cookie"] == "capsule_session=abc123"
    await client.aclose()


async def test_resolve_auth_unreachable_fails_closed():
    def handler(_req: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("auth down")

    client = _client(handler)
    assert await client.resolve("capsule_session=tok") is None
    await client.aclose()
