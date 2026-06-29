---
title: backend/learn — q-поиск только по слову (word.text), без gloss
status: ready
audience: owner-сессия backend-learn (scope `backend-learn`)
last_updated: 2026-06-28
adr_refs: [064]
---

# Кто / запуск

Owner `backend/learn` (scope **`backend-learn`**): `.\claude-scope.ps1 -Scope backend-learn`. Read `backend/learn/OWNERSHIP.md`. Commit-only.

# Баг

`GET /learn/lang/senses?q=...` сейчас матчит подстроку **и в `word.text`, и в `gloss`** (определении). Из-за этого поиск выдаёт неожиданное: `q=ase` → `glad` (его gloss содержит "...ase..." в "pleased"), `q=as` → happy+glad (gloss "pleasure"/"pleased"). Пользователь ищет по **написанию слова**, а прилетает матч по тексту определения.

# Фикс

В `backend/learn/src/capsule_learn/modules/lang/repo.py` — в функции фильтра senses: **оставить `q`-матч ТОЛЬКО по `word.text`** (case-insensitive substring, `ilike('%q%')`), **убрать матч по `gloss`** (и по другим полям, если добавлены).

Поведение после фикса:
- `q=gla` → glad; `q=happ` → happy; `q=bank` → bank×2.
- `q=ase` → ∅ (нет слова со "ase" в написании).

# Что НЕ делаем
- Fuzzy / prefix-only / ranking — не сейчас (простой substring по text достаточно).
- Поиск по определению — **если понадобится**, отдельным опциональным параметром (напр. `?inGloss=true`), не дефолтом. Не в этом брифе.

# Acceptance
- `q` фильтрует только по `word.text`. Проверь curl'ом по живому seed:
  - `GET /learn/lang/senses?q=ase` → `{ "senses": [] }`
  - `GET /learn/lang/senses?q=gla` → glad
  - `GET /learn/lang/senses?q=bank` → 2 senses (bank)
- `uv run pytest` зелёные (обнови `test_senses_api` если там кейс на gloss-матч q).
- `uv run ruff check .` clean.

# После
Architect перезапустит сервер :8003 — поиск в app'е (`/library/explorer`) станет искать по написанию слова.
