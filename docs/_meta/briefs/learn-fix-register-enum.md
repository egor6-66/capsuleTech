---
title: backend/learn — расширить Register enum (vulgar/literary, +задел)
status: ready
audience: owner-сессия backend-learn (scope `backend-learn`)
last_updated: 2026-06-29
adr_refs: ["064-A"]
---

# Кто / запуск

Owner `backend/learn` (scope **`backend-learn`**): `.\claude-scope.ps1 -Scope backend-learn`. Read `backend/learn/OWNERSHIP.md`. Commit-only.

# Баг (поймал полный датасет)

`Register` enum = `formal | informal | neutral`. Но учитель использует **`vulgar`** (tart, fuck) и **`literary`** (charade, heaven-sent, rent) — 5 слов из ~170 зарубились на `register`. Регистров в реальной лексике больше трёх.

# Фикс

В `backend/learn/src/capsule_learn/enums.py`, enum `Register` — добавить значения. Минимум под датасет: **`vulgar`**, **`literary`**. Рекомендую сразу с заделом (учитель будет обогащать):
```
formal, informal, neutral, colloquial, slang, vulgar, literary, archaic, dated, technical
```
(`native_enum=False` → колонка строковая, миграция БД НЕ нужна; только Python-enum.)

`register`-нормализатор (lowercase, добавлен в прошлом брифе) уже есть — новые значения подхватятся.

# Acceptance
- `Register` содержит vulgar + literary (+ задел).
- Полный датасет импортится **без register-ошибок** (architect ре-импортит 4 файла из `docs/_meta/briefs/learn-vocab/` → ~170 senses, 0 skipped кроме реально битых).
- `uv run pytest` зелёные; `uv run ruff check .` clean.

# После
Architect: `rm learn.db; alembic upgrade head; import 4 файла` → все ~170 слов в app'е.
