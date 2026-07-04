"""Fake image engine — deterministic 1×1 PNG, no ML stack.

The contract guarantee for CI: registry + /image wiring + caching are tested
without downloading gigabytes of diffusion weights. The pixel colour is derived
from sha256(prompt|size|seed) so output is deterministic per params, differs by
seed/prompt/size, and is a byte-valid PNG (`\\x89PNG` magic). Pure stdlib — no
Pillow needed.
"""

from __future__ import annotations

import hashlib
import struct
import zlib


def _png(width: int, height: int, rgb: tuple[int, int, int]) -> bytes:
    """Minimal valid RGB PNG (single solid colour) using only the stdlib."""

    def chunk(typ: bytes, data: bytes) -> bytes:
        body = typ + data
        crc = zlib.crc32(body) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + body + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB, no interlace
    row = b"\x00" + bytes(rgb) * width  # filter byte 0 + pixels
    raw = row * height
    idat = zlib.compress(raw, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


class FakeEngine:
    name = "fake"

    def generate(self, prompt: str, *, size: str = "512x512", seed: int = 0) -> bytes:
        digest = hashlib.sha256(f"{prompt}|{size}|{seed}".encode()).digest()
        return _png(1, 1, (digest[0], digest[1], digest[2]))
