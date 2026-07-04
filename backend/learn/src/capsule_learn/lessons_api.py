"""learn lessons router — passthrough of lang lessons + drill-word enrichment.

ADR 069 ф.1 / ADR 067: lang owns lesson *content* (concepts/rules/drills,
markdown bodies) — learn forwards it verbatim and only adds a vocabulary layer:
each `drill.words[]` headword is resolved to its lang sense and enriched with
`ru`/`pron_ru`/`audio.url`/`image.url` (the same library-style enrichment the
senses composer applies), returned as `words_resolved[]` on the drill.

Unlike the senses router, learn does NOT re-declare lang's lesson shapes: the
lesson body is passed through as-is (no response_model), so a new lang lesson
field never silently drops here. Only the enrichment (`ResolvedWord`) is typed.

Degradation: lang down → honest 502 (without lang there are no lessons — the
voice/image `null` degradation does not apply). voice/image down → words ride
with `audio`/`image: null` (existing composer mechanics).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from .checker import check_item
from .clients.image import ImageClient
from .clients.lang import LangClient
from .clients.voice import VoiceClient
from .compose import audio_block, image_block
from .config import settings
from .schemas import DrillCheckRequest, DrillCheckResponse, ResolvedWord

router = APIRouter(prefix="/learn", tags=["lessons"])


def _public_item(index: int, item: dict[str, Any]) -> dict[str, Any]:
    """Front-facing drill item — the answer key (answerEn/accept/nearMiss/
    graboTag) is stripped here so it never reaches the browser; grading happens
    server-side via POST /learn/drills/{id}/check. `index` addresses the item
    in that check call.
    """
    return {"index": index, "promptRu": item["promptRu"], "context": item.get("context")}


async def _resolve_word(
    word: str,
    lang: LangClient,
    voice: VoiceClient,
    image: ImageClient,
    memo: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Resolve one drill headword to its sense + media; memoized per request."""
    if word in memo:
        return memo[word]

    data = await lang.senses({"lang": settings.default_lang, "q": word})
    # `q` is a substring match upstream — pin to the exact headword so "come"
    # doesn't resolve to "become"/"outcome". A word may carry several senses;
    # the first exact match represents it in the drill tile.
    sense = next(
        (s for s in data["senses"] if s["text"].lower() == word.lower()), None
    )

    text = sense["text"] if sense else word
    pos = sense["pos"] if sense else None
    resolved = ResolvedWord(
        text=word,
        senseId=sense["id"] if sense else None,
        ru=sense["ru"] if sense else None,
        pron_ru=sense["pron_ru"] if sense else None,
        pos=pos,
        audio=await audio_block(voice, text, settings.default_lang),
        # image needs a resolved pos for the prompt; unresolved word → no image.
        image=await image_block(image, text, pos) if pos is not None else None,
    )
    memo[word] = resolved.model_dump()
    return memo[word]


async def _enrich_drill(
    drill: dict[str, Any],
    lang: LangClient,
    voice: VoiceClient,
    image: ImageClient,
    memo: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Apply the lesson drill mechanics in place: sanitize items (strip the
    answer key — point-surgical, the rest of the drill keeps passthrough
    immunity) and attach `words_resolved`. Shared by the lesson and rule
    composers so both stay identical (no copy of the enrichment).
    """
    drill["items"] = [_public_item(i, it) for i, it in enumerate(drill["items"])]
    drill["words_resolved"] = [
        await _resolve_word(w, lang, voice, image, memo) for w in drill["words"]
    ]
    return drill


@router.get("/lessons")
async def list_lessons(request: Request) -> Any:
    # Pure passthrough — lang owns the {id, title, level, tags} list shape.
    return await request.app.state.lang.lessons()


@router.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, request: Request) -> Any:
    lesson = await request.app.state.lang.lesson(lesson_id)
    lang: LangClient = request.app.state.lang
    voice: VoiceClient = request.app.state.voice
    image: ImageClient = request.app.state.image

    memo: dict[str, dict[str, Any]] = {}
    for drill in lesson["drills"]:
        await _enrich_drill(drill, lang, voice, image, memo)
    return lesson


@router.get("/concepts")
async def list_concepts(request: Request) -> Any:
    # Pure passthrough — lang owns the concept-library shape.
    return await request.app.state.lang.concepts()


@router.get("/concepts/{concept_id}")
async def get_concept(concept_id: str, request: Request) -> Any:
    # Passthrough of the full concept body (no response_model → immune to a
    # new lang field silently dropping). 404 mirrored from lang.
    return await request.app.state.lang.concept(concept_id)


@router.get("/rules")
async def list_rules(request: Request) -> Any:
    # Pure passthrough — lang owns the {id, title, tags} rule-index shape.
    return await request.app.state.lang.rules()


@router.get("/rules/{rule_id}")
async def get_rule(rule_id: str, request: Request) -> Any:
    # Composition: the rule body verbatim + its drills, each run through the
    # same lesson mechanics (items sanitized, words_resolved enriched). The rule
    # 404 is mirrored from lang; an empty drill list is a valid answer.
    lang: LangClient = request.app.state.lang
    voice: VoiceClient = request.app.state.voice
    image: ImageClient = request.app.state.image

    rule = await lang.rule(rule_id)  # unknown rule_id → lang 404 mirrored
    data = await lang.drills_by_rule(rule_id)

    memo: dict[str, dict[str, Any]] = {}
    drills = [
        await _enrich_drill(drill, lang, voice, image, memo)
        for drill in data["drills"]
    ]
    return {**rule, "drills": drills}


@router.post("/drills/{drill_id}/check", response_model=DrillCheckResponse,
             response_model_exclude_none=True)
async def check_drill(
    drill_id: str, body: DrillCheckRequest, request: Request
) -> DrillCheckResponse:
    # Answer key stays server-side: the drill (with answerEn/accept/nearMiss)
    # is fetched per-request from lang and graded here. No drill cache (early).
    lang: LangClient = request.app.state.lang
    drill = await lang.drill(drill_id)  # unknown drill_id → lang 404 mirrored
    items = drill["items"]
    if not 0 <= body.item_index < len(items):
        raise HTTPException(status_code=404, detail="drill item not found")
    result = check_item(items[body.item_index], body.answer, body.reveal)
    return DrillCheckResponse(**result)
