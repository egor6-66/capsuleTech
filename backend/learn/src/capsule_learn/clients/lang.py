"""lang client — GETs against backend/lang (:8002, ADR 067 D2)."""

from __future__ import annotations

from typing import Any

import httpx

TIMEOUT = 5.0


class LangError(Exception):
    """Upstream lang failure; the app maps it to an HTTP response."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class LangClient:
    def __init__(self, base_url: str) -> None:
        self._http = httpx.AsyncClient(base_url=base_url, timeout=TIMEOUT)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        try:
            resp = await self._http.get(path, params=params)
        except httpx.HTTPError as exc:
            raise LangError(502, f"lang unavailable: {exc}") from exc
        if resp.status_code >= 500:
            raise LangError(502, f"lang error: HTTP {resp.status_code}")
        if resp.is_client_error:
            # Mirror upstream 4xx (404 sense not found, 422 bad filter) as-is.
            try:
                detail = resp.json().get("detail", resp.text)
            except ValueError:
                detail = resp.text
            raise LangError(resp.status_code, detail)
        return resp.json()

    async def senses(self, params: dict[str, Any]) -> dict[str, Any]:
        return await self._get("/lang/senses", params)

    async def sense(self, sense_id: int) -> dict[str, Any]:
        return await self._get(f"/lang/sense/{sense_id}")

    async def related(self, params: dict[str, Any]) -> dict[str, Any]:
        return await self._get("/lang/senses/related", params)

    async def lessons(self) -> dict[str, Any]:
        return await self._get("/lang/lessons")

    async def lesson(self, lesson_id: str) -> dict[str, Any]:
        return await self._get(f"/lang/lessons/{lesson_id}")

    async def drill(self, drill_id: str) -> dict[str, Any]:
        # The full drill incl. the answer key (answerEn/accept/nearMiss) — used
        # by the checker, never forwarded to the browser. 404 mirrored as-is.
        return await self._get(f"/lang/drills/{drill_id}")
