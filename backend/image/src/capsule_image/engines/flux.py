"""FLUX.1-schnell engine — diffusers text-to-image, 1-4 steps (Apache 2.0).

NOT the default: FLUX needs ~12GB+ VRAM and the user's GPU is unknown. Behind a
separate extra so it never installs by accident. `schnell` is timestep-distilled
(guidance 0, few steps) and Apache-2.0 licensed — unlike FLUX.1-dev which is
non-commercial (rejected, ADR 065).

Install: `uv sync --extra gen --extra gen-flux`.
Air-gapped/prod: point `FLUX_MODEL_PATH` at a local model snapshot.
"""

from __future__ import annotations

import io

from ..config import settings
from ..engine import parse_size

_DEFAULT_MODEL = "black-forest-labs/FLUX.1-schnell"


class FluxSchnellEngine:
    name = "flux-schnell"

    def __init__(self) -> None:
        self._pipe = None
        self._device = "cpu"

    def _pipeline(self):
        if self._pipe is None:
            import torch
            from diffusers import FluxPipeline

            model = settings.flux_model_path or _DEFAULT_MODEL
            self._device = settings.torch_device or ("cuda" if torch.cuda.is_available() else "cpu")
            dtype = torch.bfloat16 if self._device == "cuda" else torch.float32
            pipe = FluxPipeline.from_pretrained(model, torch_dtype=dtype)
            self._pipe = pipe.to(self._device)
        return self._pipe

    def generate(self, prompt: str, *, size: str = "512x512", seed: int = 0) -> bytes:
        import torch

        pipe = self._pipeline()
        width, height = parse_size(size)
        generator = torch.Generator(device=self._device).manual_seed(seed)
        # schnell is guidance-distilled: guidance_scale=0.0, few steps.
        image = pipe(
            prompt=prompt,
            num_inference_steps=4,
            guidance_scale=0.0,
            width=width,
            height=height,
            max_sequence_length=256,
            generator=generator,
        ).images[0]
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()
