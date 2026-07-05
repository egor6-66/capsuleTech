---
title: backend/learn — lessons-композиция (passthrough lang + обогащение слов дрилла)
status: ready (контракт /lang/lessons* уже жив — 58916401; live-smoke ждёт контент-правок учителя)
audience: owner-сессия `claude-scope -Scope backend-learn` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [067, 069]
---

# Контекст

ADR 069 ф.1: lang отдаёт уроки (`GET /lang/lessons`, `/lang/lessons/{id}` —
композиция concepts/rules/drills по порядку). learn = stateless-композитор
(ADR 067): фронт ходит ТОЛЬКО в learn-BFF; learn обогащает уроки словарной
частью (озвучка/картинки слов дрилла — как в library-выдаче).

# Scope (backend/learn)

1. **`clients/lang.py`** — если прямых lessons-вызовов ещё нет: httpx к
   `/lang/lessons*` (паттерн существующего lang-клиента senses).
2. **Эндпоинты:**
   - `GET /learn/lessons` → passthrough списка (id/title/level/tags);
   - `GET /learn/lessons/{id}` → урок из lang + **обогащение**: для
     `drill.words[]` подтянуть sense-выдачу СВОИМ существующим композитором
     (ru/pron_ru/audio.url/image.url) → поле `words_resolved[]` на дрилле.
     Концепты/правила — passthrough (markdown body как есть).
3. **Деградация:** lang лежит → 502/504 честно (это НЕ voice-кейс: без lang
   уроков нет, null-деградация неуместна); voice/image лежат → слова едут с
   `audio/image: null` (существующая механика).
4. **Тесты:** mock httpx — passthrough формы, обогащение words, порядок
   concepts/rules/drills сохранён, 404 незнакомого id пробрасывается.

# Что НЕ делаем

- Проверку ответов дрилла (фаза 2 ADR 069 — форма решается отдельно, есть
  открытая развилка «checker в lang vs learn vs фронт»).
- Кэширование уроков (рано).

# Acceptance

`uv run pytest` + ruff зелёные. Live-smoke (когда учитель поправит vault и
lang переимпортит): `GET 127.0.0.1:8003/learn/lessons/past-perfect` (или
какой id будет) отдаёт урок с обогащёнными словами. Если контент ещё не
готов — зафиксировать в OWNERSHIP «live pending round-2 import», mock-тесты =
гарант контракта.
