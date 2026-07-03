"""Composer passthrough — lang shapes preserved, upstream errors mapped."""

from __future__ import annotations

import httpx

from capsule_learn.config import settings
from conftest import RELATED, SENSE_DETAIL, SENSE_LIST_ITEM


def test_senses_passthrough_shape(upstream, client):
    route = upstream.get(f"{settings.lang_url}/lang/senses").respond(
        json={"senses": [SENSE_LIST_ITEM]}
    )
    resp = client.get("/learn/lang/senses", params={"q": "ice", "tag": ["food"]})
    assert resp.status_code == 200
    item = resp.json()["senses"][0]
    # Same form as before the extraction — every lang field survives.
    for key, value in SENSE_LIST_ITEM.items():
        assert item[key] == value
    # Filters are forwarded to lang.
    sent = route.calls.last.request.url
    assert sent.params["q"] == "ice"
    assert sent.params.get_list("tag") == ["food"]
    assert sent.params["lang"] == "en_US"


def test_sense_detail_passthrough(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/sense/1").respond(json=SENSE_DETAIL)
    resp = client.get("/learn/lang/sense/1")
    assert resp.status_code == 200
    body = resp.json()
    for key, value in SENSE_DETAIL.items():
        assert body[key] == value


def test_sense_404_maps_to_404(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/sense/99").respond(
        status_code=404, json={"detail": "sense not found"}
    )
    resp = client.get("/learn/lang/sense/99")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "sense not found"


def test_lang_down_maps_to_502(upstream, client):
    upstream.get(f"{settings.lang_url}/lang/senses").mock(
        side_effect=httpx.ConnectError("refused")
    )
    resp = client.get("/learn/lang/senses")
    assert resp.status_code == 502
    assert "lang unavailable" in resp.json()["detail"]


def test_related_passthrough(upstream, client):
    route = upstream.get(f"{settings.lang_url}/lang/senses/related").respond(json=RELATED)
    resp = client.get("/learn/lang/senses/related", params={"sense": 1, "context": "food"})
    assert resp.status_code == 200
    assert resp.json() == RELATED
    sent = route.calls.last.request.url
    assert sent.params["sense"] == "1"
    assert sent.params["context"] == "food"
