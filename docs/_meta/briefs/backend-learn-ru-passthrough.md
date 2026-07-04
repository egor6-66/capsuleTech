---
title: backend/learn — донести поле `ru` из lang (контракт-каскад)
status: ready
audience: owner-сессия `claude-scope -Scope backend-learn` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [067]
---

# Контекст

lang разделил перевод и определение: `gloss` = en-определение, `ru` = русский перевод (+`ru` у examples уже был). Learn-композитор владеет СВОИМИ response-моделями (ADR 067) и молча отбрасывает незнакомое поле → «перевод пропал» на фронте.

# Scope

`src/capsule_learn/schemas.py`: добавить `ru: str | None` в `SenseListItem` и `SenseDetail` (рядом с `gloss`). Больше ничего — passthrough, learn значение не трактует.

# Тесты

В conftest-моках lang (`SENSE_LIST_ITEM`/`SENSE_DETAIL`) добавить `"ru": "..."`; ассерт в test_senses_api: `ru` присутствует в ответах list и detail.

# Acceptance

`uv run pytest` зелёные; `uv run ruff check .` — 0; live: `curl :8003/learn/lang/senses?q=bank` → у sense есть `ru`.

# Урок (зафиксировать в OWNERSHIP)

Контракт-каскад: изменение полей ответа в capability (lang/voice) ТРЕБУЕТ синхронного апдейта моделей композитора — иначе поле молча теряется. При ревью lang-изменений проверять learn.
