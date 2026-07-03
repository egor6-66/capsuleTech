"""Edge TTS engine — Microsoft Edge neural voices over the network.

NOT local: requires internet, audio is produced by a Microsoft endpoint.
Near-instant start (no model download), excellent pronunciation — the
trade-off is the online dependency. Install: `uv sync --extra voice-edge`.
`voice` = Edge voice name (e.g. "en-US-AriaNeural", full list:
`edge-tts --list-voices`).
"""

from __future__ import annotations

import asyncio
import io

_DEFAULT_VOICE = "en-US-AriaNeural"


class EdgeEngine:
    name = "edge"

    def synthesize(
        self,
        text: str,
        *,
        lang: str = "en_US",
        voice: str | None = None,
        speed: float = 1.0,
    ) -> bytes:
        import edge_tts
        import soundfile as sf

        rate = f"{round((speed - 1.0) * 100):+d}%"

        async def _stream() -> bytes:
            communicate = edge_tts.Communicate(text, voice or _DEFAULT_VOICE, rate=rate)
            return b"".join(
                [chunk["data"] async for chunk in communicate.stream() if chunk["type"] == "audio"]
            )

        # Endpoint runs sync in a threadpool — no event loop in this thread.
        mp3 = asyncio.run(_stream())
        # Contract is WAV; decode the mp3 stream (libsndfile >= 1.1 reads mp3).
        data, sample_rate = sf.read(io.BytesIO(mp3))
        buf = io.BytesIO()
        sf.write(buf, data, sample_rate, format="WAV")
        return buf.getvalue()
