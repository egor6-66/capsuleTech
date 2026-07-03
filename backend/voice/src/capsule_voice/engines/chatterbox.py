"""Chatterbox TTS engine (Resemble AI, MIT). Heavy deps (`chatterbox-tts`/torch,
`soundfile`, `numpy`) are imported lazily — the module loads light; the model
initialises on first synthesize and is then reused.

Install with the optional extra: `uv sync --extra voice-chatterbox`.
Air-gapped/prod: point `CHATTERBOX_MODEL_PATH` at a local checkpoint dir.

`voice` = path to a reference audio clip (voice cloning); omit for the
built-in default voice. `speed` is not natively supported by Chatterbox and
is ignored (see README).
"""

from __future__ import annotations

import io

from ..config import settings


class ChatterboxEngine:
    name = "chatterbox"

    def __init__(self) -> None:
        self._model = None

    def _load(self):
        if self._model is None:
            import torch
            from chatterbox.tts import ChatterboxTTS

            device = settings.chatterbox_device or (
                "cuda" if torch.cuda.is_available() else "cpu"
            )
            if settings.chatterbox_model_path:
                self._model = ChatterboxTTS.from_local(settings.chatterbox_model_path, device)
            else:
                self._model = ChatterboxTTS.from_pretrained(device=device)
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

        model = self._load()
        kwargs = {}
        if voice:
            kwargs["audio_prompt_path"] = voice  # reference clip -> voice cloning
        wav = model.generate(text, **kwargs)  # torch.Tensor (1, N)
        audio = wav.squeeze(0).cpu().numpy()
        buf = io.BytesIO()
        sf.write(buf, audio, model.sr, format="WAV")
        return buf.getvalue()
