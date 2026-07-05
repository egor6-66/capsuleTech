# backend/community — `capsule-community`

Social core of the capsule ecosystem (**ADR 071**): profile (avatar/bio/
contacts), an append-only **event journal**, and the first projections
(points / stats / leaderboard). Identity stays in auth (**ADR 068**) — this
service adds the "human" and "social" layers on top.

- **Stack:** Python 3.12, [uv](https://docs.astral.sh/uv/), FastAPI, SQLAlchemy 2.0, Alembic, SQLite-file.
- **Port:** `8006` (voice 8001 / lang 8002 / learn 8003 / auth 8004 / community 8006 — ADR 055/067/068/071).
- **DB:** `DATABASE_URL` (default `sqlite:///./community.db`) — drop-in Postgres later.

## Run

```bash
uv sync --extra dev                                          # install deps
uv run alembic upgrade head                                  # create schema (community.db)
uv run uvicorn capsule_community.main:app --port 8006 --reload
```

```bash
uv run pytest          # tests (in-memory SQLite, auth + S3 mocked)
uv run ruff check .    # lint
```

### Env vars

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./community.db` | SQLAlchemy URL; drop-in Postgres switch |
| `PORT` | `8006` | service port (ADR 071) |
| `AUTH_URL` | `http://localhost:8004` | backend/auth base URL for session passthrough (ADR 071 D2) |
| `S3_URL` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | *(empty)* | MinIO/S3 for avatars; empty → avatar endpoint answers 503 |
| `S3_SECURE` | `false` | TLS to the S3 endpoint |
| `INTERNAL_KEY` | *(empty)* | shared secret for `/internal/*`; empty → those routes answer 503 |
| `CORS_ORIGINS` | `[]` | empty = no CORS middleware (dev-gateway keeps everything same-origin) |

## Contract (ADR 071 D2/D3/D4)

### Session (D2)

Community resolves the caller by **passing the request cookie straight through**
to `auth GET /auth/me` (httpx) — it knows no passwords/tokens. 200 → member,
anything else → guest. **No caching** (revocation must bite instantly, ADR 068 D3).

### Profile (D3) — `/community/*`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/community/profile` | member | own profile; **auto-created** on first hit (nick = auth login) |
| PUT | `/community/profile` | member | update `nick` / `bio` / `contacts`. 409 if nick taken |
| POST | `/community/profile/avatar` | member | multipart upload → MinIO `avatars` bucket. 503 unconfigured / 415 bad type / 413 too large |
| GET | `/community/profiles/{user_id}` | public | single profile (avatar in any app's header). 404 if none |
| GET | `/community/members` | public | member cards (nick + avatar) |

Avatar URL sent to the frontend is `/media/avatars/<key>` (the gateway maps that
route to MinIO — architect zone). The DB stores only the object key.

### Event journal + projections (D4)

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/internal/events` | `X-Internal-Key` | **batch INSERT** only. NOT published through the gateway. 503 if unconfigured / 403 on bad key |
| GET | `/community/stats/{user_id}` | public | `{ total_points, per_app: { learn: { points, drills_passed } } }` |
| GET | `/community/leaderboard?app=&limit=` | public | top by points (nick + avatar) |

Events are **append-only** (no update/delete path). Ratings/stats are
**projections** over the journal — a new metric is a new query over accumulated
history, zero data migration. Points rules v1 live in `projections.py`
(`kind → points`, e.g. `drill.passed = +10`) and are meant to be extended.
**Only app backends write** (server-to-server; frontends never — "front is an
interface"). First supplier: learn-BFF (a separate brief).

## Model (ADR 071 D3/D4)

- **`profiles`** — `user_id (PK, = auth id, by value), nick (unique), bio?, avatar_key?, contacts (JSON), created_at`.
- **`events`** — `id, user_id, source_app, kind, payload (JSON), ts`; indexes `(user_id, ts)`, `(source_app, kind)`.

`user_id` is **not** a foreign key — auth is a separate service/database
(ADR 068 D1); the reference is by value, resolved via the session client.
