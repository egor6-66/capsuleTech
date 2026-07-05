"""FastAPI app — learn composer over lang + voice (ADR 067)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .api import router as lang_router
from .clients.image import ImageClient
from .clients.lang import LangClient, LangError
from .clients.voice import VoiceClient
from .config import settings
from .lessons_api import router as lessons_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.lang = LangClient(settings.lang_url)
    app.state.voice = VoiceClient(settings.voice_url, settings.voice_public())
    app.state.image = ImageClient(settings.image_url, settings.image_public())
    yield
    await app.state.lang.aclose()
    await app.state.voice.aclose()
    await app.state.image.aclose()


app = FastAPI(title="capsule-learn", version="0.2.0", lifespan=lifespan)


@app.exception_handler(LangError)
async def lang_error(_: Request, exc: LangError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(lang_router)
app.include_router(lessons_router)
