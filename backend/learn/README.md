# backend/learn — `capsule-learn`

Learn-service — **composer** (BFF, ADR 055 D2 / ADR 067): learning payloads
are composed from the capability services — lexical data from
`backend/lang` (:8002), audio links to `backend/voice` (:8001), «word +
pronunciation side by side». Holds no lexical DB and no TTS engines;
**stateless** until user-state (progress/SRS) arrives in a later wave.

- **Stack:** Python 3.12+, [uv](https://docs.astral.sh/uv/), FastAPI, httpx.
- **Port:** `8003` (voice 8001 / lang 8002 / learn 8003 — ADR 055).

## Run

```bash
uv sync --extra dev
uv run uvicorn capsule_learn.main:app --port 8003 --reload
```

Upstreams are expected at their default ports; override via env (ADR 067 D4):

| Env | Default | Purpose |
|---|---|---|
| `LANG_URL` | `http://localhost:8002` | lang capability service |
| `VOICE_URL` | `http://localhost:8001` | voice capability service |
| `VOICE_PUBLIC_URL` | = `VOICE_URL` | browser-facing base for `audio.url` (reverse-proxy deployments) |
| `PORT` | `8003` | |
| `DEFAULT_LANG` | `en_US` | |

```bash
uv run pytest          # tests (respx-mocked upstreams — no live services needed)
uv run ruff check .    # lint
```

## Endpoints

Front contract is preserved from the pre-extraction service — same paths,
same response forms, now composed:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/learn/lang/senses` | lang passthrough (`lang`,`pos`,`level`,`register`,`connotation`,`synset`,`domain`,`tier`,`tag`*,`q`) + `audio` per item |
| GET | `/learn/lang/sense/{id}` | rich sense detail + `audio` |
| GET | `/learn/lang/senses/related?sense={id}` | lang passthrough (`context`, `limit`) |

**Audio composition (ADR 067 D2):** `SenseListItem` / `SenseDetail` carry

```json
"audio": { "url": "<VOICE_PUBLIC_URL>/voice/speak?text=ice+cream&lang=en_US", "engines": ["kokoro"] }
```

— a ready-to-play link (front hits voice directly via `<audio src>`), never
audio bytes. `engines` comes from `GET /voice/engines`, cached in memory with
a TTL. Voice down → `audio: null` + warning log (a word without audio beats
a 502). Lang down → `502` with detail; lang 4xx (404/422) are mirrored as-is.

The old `/learn/voice/*` endpoints are gone — talk to voice (:8001) directly.
