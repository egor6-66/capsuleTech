"""Piper TTS engine — fast ONNX synthesis on CPU, small models (~60MB).

Install with the optional extra: `uv sync --extra voice-piper`.
Default voice downloads from Hugging Face (`rhasspy/piper-voices`) on first
use; air-gapped/prod: point `PIPER_MODEL_PATH` at a local `.onnx` voice
(the `.onnx.json` config must sit next to it).
"""

from __future__ import annotations

import io
import wave

from ..config import settings

_DEFAULT_VOICE = "en_US-lessac-medium"
# repo path inside rhasspy/piper-voices: <lang>/<locale>/<name>/<quality>/<file>
_HF_REPO = "rhasspy/piper-voices"


def _hf_voice_path(voice: str) -> str:
    locale, name, quality = voice.split("-", 2)
    lang = locale.split("_")[0]
    return f"{lang}/{locale}/{name}/{quality}/{voice}.onnx"


class PiperEngine:
    name = "piper"

    def __init__(self) -> None:
        self._voices: dict[str, object] = {}

    def _load(self, voice: str):
        if voice not in self._voices:
            from piper import PiperVoice

            if settings.piper_model_path:
                model_path = settings.piper_model_path
            else:
                from huggingface_hub import hf_hub_download

                rel = _hf_voice_path(voice)
                model_path = hf_hub_download(_HF_REPO, rel)
                hf_hub_download(_HF_REPO, rel + ".json")  # config next to model
            self._voices[voice] = PiperVoice.load(model_path)
        return self._voices[voice]

    def synthesize(
        self,
        text: str,
        *,
        lang: str = "en_US",
        voice: str | None = None,
        speed: float = 1.0,
    ) -> bytes:
        from piper import SynthesisConfig

        piper_voice = self._load(voice or _DEFAULT_VOICE)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wav_file:
            piper_voice.synthesize_wav(
                text, wav_file, syn_config=SynthesisConfig(length_scale=1.0 / speed)
            )
        return buf.getvalue()
