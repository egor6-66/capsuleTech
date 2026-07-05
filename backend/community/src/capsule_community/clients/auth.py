"""Session resolution against backend/auth (ADR 071 D2).

Community is the first "domain service" of ADR 068 D3: it knows no passwords or
tokens. It resolves the caller by passing the request's Cookie header straight
through to `auth GET /auth/me` (httpx). A 200 means member; anything else
(no cookie / 401 / auth unreachable) means guest.

No caching — revocation must bite instantly (canon ADR 068 D3): the source of
truth is auth on every request.
"""

from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request
from pydantic import BaseModel

TIMEOUT = 5.0


class AuthUser(BaseModel):
    """Minimal identity projection returned by auth /auth/me (ADR 068 D2)."""

    id: int
    login: str
    role: str


class AuthClient:
    def __init__(self, base_url: str, *, transport: httpx.BaseTransport | None = None) -> None:
        self._http = httpx.AsyncClient(base_url=base_url, timeout=TIMEOUT, transport=transport)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def resolve(self, cookie_header: str | None) -> AuthUser | None:
        """Live user for the request's cookie, or None (guest). Auth being
        unreachable fails closed (guest) — writes are denied, reads stay public."""
        if not cookie_header:
            return None
        try:
            resp = await self._http.get("/auth/me", headers={"cookie": cookie_header})
        except httpx.HTTPError:
            return None
        if resp.status_code == 200:
            return AuthUser(**resp.json())
        return None


# ---- FastAPI dependencies ----------------------------------------------------
# The AuthClient lives on app.state (created in main.lifespan). Tests override
# these dependencies directly to avoid the network round-trip.
async def optional_user(request: Request) -> AuthUser | None:
    client: AuthClient = request.app.state.auth
    return await client.resolve(request.headers.get("cookie"))


async def current_user(user: Annotated[AuthUser | None, Depends(optional_user)]) -> AuthUser:
    # Depends(optional_user) (not a direct call) so a test override of
    # optional_user propagates here too.
    if user is None:
        raise HTTPException(status_code=401, detail="authentication required")
    return user


CurrentUser = Depends(current_user)
OptionalUser = Depends(optional_user)
