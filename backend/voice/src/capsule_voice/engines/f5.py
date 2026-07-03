"""F5-TTS engine — SOTA flow-matching TTS, cloning-first. The slowest of the
registry on CPU (minutes per sentence); the niche is maximum pronunciation
quality when latency does not matter.

Install with the optional extra: `uv sync --extra voice-f5`.
F5 always synthesizes against a reference clip: `voice` = path to a reference
audio — its transcription is auto-derived via whisper, which needs the
`ffmpeg` system binary (present in the Docker image; on dev install ffmpeg or
pass a known-text reference). Omit `voice` to use the example reference
bundled with the package (known transcript, no whisper/ffmpeg involved).
"""

from __future__ import annotations

import io
from importlib import resources

from ..config import settings

# Transcript of the bundled basic_ref_en.wav — passing it skips whisper.
_DEFAULT_REF_TEXT = "Some call me nature, others call me mother nature."


class F5Engine:
    name = "f5"

    def __init__(self) -> None:
        self._tts = None
        self._default_ref: str | None = None

    def _load(self):
        if self._tts is None:
            from f5_tts.api import F5TTS

            self._tts = F5TTS(device=settings.torch_device)
            self._default_ref = str(
                resources.files("f5_tts") / "infer" / "examples" / "basic" / "basic_ref_en.wav"
            )
        return self._tts

    def synthesize(
        self,
        text: str,
        *,
        lang: str = "en_US",
        voice: str | None = None,
        speed: float = 1.0,
    ) -> bytes:
        import soundfile as sf

        tts = self._load()
        # ref_text="" -> auto-transcription of the reference (whisper + ffmpeg).
        ref, ref_text = (voice, "") if voice else (self._default_ref, _DEFAULT_REF_TEXT)
        wav, sample_rate, _ = tts.infer(
            ref_file=ref, ref_text=ref_text, gen_text=text, speed=speed
        )
        buf = io.BytesIO()
        sf.write(buf, wav, sample_rate, format="WAV")
        return buf.getvalue()
