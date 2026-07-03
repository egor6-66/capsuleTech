"""Coqui XTTS-v2 engine (`coqui-tts`, idiap-maintained fork) — multilingual
TTS + voice cloning. Heavy torch stack, slow on CPU, quality high.

License note: the XTTS-v2 model weights are CPML (non-commercial); the first
load auto-accepts the license via COQUI_TOS_AGREED (review before prod use).

Install with the optional extra: `uv sync --extra voice-xtts`.
`voice` = path to a reference audio clip (voice cloning); omit for the
built-in default speaker. `lang` maps "en_US" -> "en".
"""

from __future__ import annotations

import io
import os

from ..config import settings

_MODEL_ID = "tts_models/multilingual/multi-dataset/xtts_v2"
_DEFAULT_SPEAKER = "Claribel Dervla"  # built-in studio speaker
_SAMPLE_RATE = 24000


class XttsEngine:
    name = "xtts"

    def __init__(self) -> None:
        self._tts = None

    def _load(self):
        if self._tts is None:
            import torch
            from TTS.api import TTS

            os.environ.setdefault("COQUI_TOS_AGREED", "1")
            device = settings.torch_device or (
                "cuda" if torch.cuda.is_available() else "cpu"
            )
            self._tts = TTS(_MODEL_ID).to(device)
        return self._tts

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

        tts = self._load()
        kwargs = {"language": lang.split("_")[0], "speed": speed}
        if voice:
            kwargs["speaker_wav"] = voice  # reference clip -> voice cloning
        else:
            kwargs["speaker"] = _DEFAULT_SPEAKER
        wav = tts.tts(text=text, **kwargs)
        buf = io.BytesIO()
        sf.write(buf, np.asarray(wav, dtype="float32"), _SAMPLE_RATE, format="WAV")
        return buf.getvalue()
