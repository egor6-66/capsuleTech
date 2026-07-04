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

from fastapi import APIRouter, Request

from .clients.image import ImageClient
from .clients.lang import LangClient
from .clients.voice import VoiceClient
from .compose import audio_block, image_block
from .config import settings
from .schemas import ResolvedWord

router = APIRouter(prefix="/learn", tags=["lessons"])


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
        drill["words_resolved"] = [
            await _resolve_word(w, lang, voice, image, memo) for w in drill["words"]
        ]
    return lesson
