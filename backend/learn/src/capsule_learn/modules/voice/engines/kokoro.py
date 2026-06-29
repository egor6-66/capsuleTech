"""Kokoro TTS engine (brief). Heavy deps (`kokoro`/torch, `soundfile`, `numpy`)
are imported lazily — the module loads light; the model initialises on first
synthesize and is then reused.

Install with the optional extra: `uv sync --extra voice`.
Air-gapped/prod: point `KOKORO_MODEL_PATH` at a local model snapshot.
"""

from __future__ import annotations

import io

from ....config import settings

# American-English voices to surface in pickers (lang_code 'a').
DEFAULT_VOICES = ("af_heart", "am_adam", "af_bella")
_DEFAULT_VOICE = "af_heart"
_SAMPLE_RATE = 24000


class KokoroEngine:
    name = "kokoro"

    def __init__(self) -> None:
        self._pipe = None

    def _pipeline(self):
        if self._pipe is None:
            from kokoro import KPipeline

            kwargs = {"lang_code": "a"}  # American English
            if settings.kokoro_model_path:
                kwargs["repo_id"] = settings.kokoro_model_path  # local snapshot ok
            self._pipe = KPipeline(**kwargs)
        return self._pipe

    def synthesize(
        self,
        text: str,
        *,
        lang: str = "en_US",
        voice: str | None = None,
        speed: float = 1.0,
    ) -> bytes:
        import numpy as np
        import soundfile as sf

        pipe = self._pipeline()
        chunks = [audio for _, _, audio in pipe(text, voice=voice or _DEFAULT_VOICE, speed=speed)]
        audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype="float32")
        buf = io.BytesIO()
        sf.write(buf, audio, _SAMPLE_RATE, format="WAV")
        return buf.getvalue()
