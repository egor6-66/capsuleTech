"""StyleTTS2 TTS engine (brief). Heavy deps (`styletts2`, `soundfile`, `numpy`)
are imported lazily — module loads light; the LibriTTS model initialises on
first synthesize and is then reused.

Install with the optional extra: `uv sync --extra voice-styletts2`.

⚠ Requires the **espeak-ng** system binary (StyleTTS2 phonemises via
phonemizer→espeak-ng). On Windows: `winget install eSpeak-NG.eSpeak-NG`.
Without it, synthesis raises at inference time.
"""

from __future__ import annotations

import io

_SAMPLE_RATE = 24000


class StyleTTS2Engine:
    name = "styletts2"

    def __init__(self) -> None:
        self._model = None

    def _tts(self):
        if self._model is None:
            from styletts2 import tts

            self._model = tts.StyleTTS2()  # downloads LibriTTS model once
        return self._model

    def synthesize(
        self,
        text: str,
        *,
        lang: str = "en_US",
        voice: str | None = None,
        speed: float = 1.0,
    ) -> bytes:
        import soundfile as sf

        # voice (speaker cloning) / speed are not wired for StyleTTS2 yet —
        # speaker selection is a later iteration (brief §What we don't do).
        model = self._tts()
        wav = model.inference(text, output_sample_rate=_SAMPLE_RATE)
        buf = io.BytesIO()
        sf.write(buf, wav, _SAMPLE_RATE, format="WAV")
        return buf.getvalue()
