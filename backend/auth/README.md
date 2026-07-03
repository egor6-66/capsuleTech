# backend/auth — `capsule-auth`

Identity core for the capsule ecosystem: one account, many login methods
(**ADR 068**). Owns `users` / `identities` / `sessions` only — no domain
knowledge (points/rating/bans live in the future community service).

- **Stack:** Python 3.12, [uv](https://docs.astral.sh/uv/), FastAPI, SQLAlchemy 2.0, Alembic, SQLite-file.
- **Port:** `8004` (voice 8001 / lang 8002 / learn 8003 / auth 8004 — ADR 055/067/068).
- **DB:** `DATABASE_URL` (default `sqlite:///./auth.db`) — drop-in Postgres later.

## Run

```bash
uv sync --extra dev                                       # install deps
uv run alembic upgrade head                               # create schema (auth.db)
uv run uvicorn capsule_auth.main:app --port 8004 --reload
```

```bash
uv run pytest          # tests (in-memory SQLite)
uv run ruff check .    # lint
```

### Env vars

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./auth.db` | SQLAlchemy URL; drop-in Postgres switch |
| `PORT` | `8004` | service port (ADR 055 allocation) |
| `SESSION_TTL_DAYS` | `30` | session cookie / row lifetime |
| `COOKIE_SECURE` | `false` | `Secure` flag on the session cookie (true in prod, behind TLS) |
| `CORS_ORIGINS` | `[]` | empty = no CORS middleware (dev-gateway keeps everything same-origin) |

## Contract (ADR 068 D2/D3 — fixed)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| POST | `/auth/register` | `{login,password}` → 201 `{id,login,role}` + Set-Cookie. 409 if login taken. |
| POST | `/auth/login` | `{login,password}` → 200 `{id,login,role}` + Set-Cookie. 401 on bad pair. |
| POST | `/auth/logout` | → 204; revokes the session row + clears the cookie. Idempotent (no cookie → still 204). |
| GET | `/auth/me` | → 200 `{id,login,role}` \| 401 (no/expired/revoked cookie = guest). Bumps `last_seen`. |

## Session model (ADR 068 D3)

Cookie `capsule_session`: **opaque** `secrets.token_urlsafe(32)`, `httpOnly`,
`SameSite=Lax`, `Secure` in prod, TTL `session_ttl_days`. The DB stores only
the **sha256 hash** of the token — a DB leak never yields hijackable
sessions. Revocation is a row delete (instant, no JWT-blocklist needed).
Expired sessions are reaped lazily: the next `/auth/me` hit against an
expired row deletes it and returns 401 (no background reaper this
iteration).

## Model (ADR 068 D2)

- **`users`** — account core: `id, login (unique), role (member|admin), created_at`.
- **`identities`** — login-strategy axis: `user_id, provider, external_id (unique per provider), secret_hash?`.
  `provider='credentials'` is the only strategy implemented; `external_id = login`,
  `secret_hash` = argon2 hash of the password. Telegram/OAuth are additive rows later —
  the `users` core never changes to add a login method.
- **`sessions`** — `id, user_id, token_hash (unique), created_at, expires_at, last_seen`.

Passwords are hashed with `argon2-cffi` only (no sha/bcrypt home-rolling).
