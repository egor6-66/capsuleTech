"""SDXL-Turbo engine — diffusers text-to-image, 1-4 steps (baseline default).

License OpenRAIL++ (permissive). Runs on a modest GPU (and CPU, slowly). Heavy
deps (`torch`/`diffusers`/`transformers`) are imported lazily — the module loads
light; the pipeline initialises on first generate and is then reused.

Install with the optional extra: `uv sync --extra gen`.
Air-gapped/prod: point `SDXL_MODEL_PATH` at a local model snapshot.
"""

from __future__ import annotations

import io

from ..config import settings
from ..engine import parse_size

_DEFAULT_MODEL = "stabilityai/sdxl-turbo"


class SdxlTurboEngine:
    name = "sdxl-turbo"

    def __init__(self) -> None:
        self._pipe = None
        self._device = "cpu"

    def _pipeline(self):
        if self._pipe is None:
            import torch
            from diffusers import AutoPipelineForText2Image

            model = settings.sdxl_model_path or _DEFAULT_MODEL
            self._device = settings.torch_device or ("cuda" if torch.cuda.is_available() else "cpu")
            dtype = torch.float16 if self._device == "cuda" else torch.float32
            pipe = AutoPipelineForText2Image.from_pretrained(model, torch_dtype=dtype)
            self._pipe = pipe.to(self._device)
        return self._pipe

    def generate(self, prompt: str, *, size: str = "512x512", seed: int = 0) -> bytes:
        import torch

        pipe = self._pipeline()
        width, height = parse_size(size)
        generator = torch.Generator(device=self._device).manual_seed(seed)
        # Turbo is guidance-distilled: guidance_scale=0.0, very few steps.
        image = pipe(
            prompt=prompt,
            num_inference_steps=1,
            guidance_scale=0.0,
            width=width,
            height=height,
            generator=generator,
        ).images[0]
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()
