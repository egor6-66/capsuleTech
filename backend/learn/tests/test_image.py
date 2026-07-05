"""Image composition — render link + engines cache, graceful image-down."""

from __future__ import annotations

import httpx

from capsule_learn.config import settings
from conftest import IMAGE_ENGINES, SENSE_DETAIL, SENSE_LIST_ITEM


def test_image_block_url_encoded_and_engines_cached(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/senses").respond(json={"senses": [SENSE_LIST_ITEM]})
    # Same-pattern registration replaces the conftest route — re-mock fully.
    engines_route = upstream.get(f"{settings.image_url}/image/engines")
    engines_route.respond(json=IMAGE_ENGINES)

    resp = client.get("/learn/lang/senses")
    image = resp.json()["senses"][0]["image"]
    # Prompt strategy v1: "{text} ({pos})", URL-encoded; never image bytes.
    assert image["url"] == f"{settings.image_url}/image/render?prompt=ice+cream+%28noun%29"

    client.get("/learn/lang/senses")
    assert engines_route.call_count == 1  # in-memory TTL cache — one probe


def test_detail_image_overrides_lang_text_stub(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/sense/1").respond(json=SENSE_DETAIL)
    resp = client.get("/learn/lang/sense/1")
    image = resp.json()["image"]
    # Composed link supersedes lang's plain-text "образ" stub.
    assert image == {"url": f"{settings.image_url}/image/render?prompt=ice+cream+%28noun%29"}


def test_image_down_yields_null_image_not_error(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/senses").respond(json={"senses": [SENSE_LIST_ITEM]})
    upstream.get(f"{settings.image_url}/image/engines").mock(
        side_effect=httpx.ConnectError("refused")
    )
    resp = client.get("/learn/lang/senses")
    assert resp.status_code == 200  # a word without a picture beats a 502
    assert resp.json()["senses"][0]["image"] is None
