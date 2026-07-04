"""learn lang router — front contract preserved, composed from lang + voice.

Same /learn/lang/* paths and response forms as before the extraction
(ADR 067 D2); payloads are fetched from lang and enriched with an `audio`
block pointing at voice.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Query, Request

from .clients.image import ImageClient
from .clients.voice import VoiceClient
from .compose import audio_block as _audio_block
from .compose import image_block as _image_block
from .config import settings
from .schemas import RelatedResponse, SenseDetail, SensesResponse

router = APIRouter(prefix="/learn/lang", tags=["lang"])


@router.get("/senses", response_model=SensesResponse)
async def list_senses(
    request: Request,
    lang: str = settings.default_lang,
    pos: str | None = None,
    level: str | None = None,
    register: str | None = None,
    connotation: str | None = None,
    synset: str | None = None,
    domain: str | None = None,
    tier: str | None = None,
    tag: Annotated[list[str] | None, Query()] = None,
    q: str | None = None,
) -> Any:
    params: dict[str, Any] = {"lang": lang}
    optional = {
        "pos": pos,
        "level": level,
        "register": register,
        "connotation": connotation,
        "synset": synset,
        "domain": domain,
        "tier": tier,
        "tag": tag,
        "q": q,
    }
    params.update({k: v for k, v in optional.items() if v is not None})
    data = await request.app.state.lang.senses(params)
    voice: VoiceClient = request.app.state.voice
    image: ImageClient = request.app.state.image
    for item in data["senses"]:
        item["audio"] = await _audio_block(voice, item["text"], lang)
        item["image"] = await _image_block(image, item["text"], item["pos"])
    return data


@router.get("/sense/{sense_id}", response_model=SenseDetail)
async def get_sense(sense_id: int, request: Request) -> Any:
    data = await request.app.state.lang.sense(sense_id)
    voice: VoiceClient = request.app.state.voice
    image: ImageClient = request.app.state.image
    data["audio"] = await _audio_block(voice, data["word"]["text"], data["word"]["lang"])
    # Overrides lang's plain-text "образ" stub with the composed picture link.
    data["image"] = await _image_block(image, data["word"]["text"], data["pos"])
    return data


@router.get("/senses/related", response_model=RelatedResponse)
async def related(
    request: Request,
    sense: Annotated[int, Query(description="source sense id")],
    context: Annotated[str | None, Query(description="tag name to weight first")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> Any:
    params: dict[str, Any] = {"sense": sense, "limit": limit}
    if context is not None:
        params["context"] = context
    return await request.app.state.lang.related(params)
