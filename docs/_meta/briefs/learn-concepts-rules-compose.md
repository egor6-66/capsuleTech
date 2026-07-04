---
title: backend/learn — passthrough concepts/rules + правило-с-дриллами (санитизация+обогащение как в уроке)
status: ready ПОСЛЕ lang-concepts-rules-lists.md
audience: owner-сессия `claude-scope -Scope backend-learn` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [067, 069]
---

# Scope (backend/learn)

1. `GET /learn/concepts` и `GET /learn/concepts/{id}` — passthrough lang.
2. `GET /learn/rules` — passthrough; `GET /learn/rules/{id}` — композиция:
   правило (body as-is) + его дриллы (`lang /lang/drills?rule=`), к дриллам
   применить СУЩЕСТВУЮЩУЮ механику урока: санитизация items (без
   answerEn/accept/nearMiss) + `words_resolved` обогащение (audio/image).
   Переиспользовать код композиции урока (общий helper), НЕ копипастить.
3. Чекер не меняется (дрилл-id глобален, `POST /learn/drills/{id}/check`
   работает из любого контекста).
4. Тесты (respx): списки; правило-с-дриллами — санитизация+обогащение;
   правило без дриллов.

# Acceptance

pytest+ruff зелёные; live: `/learn/rules/grammar-pronouns` → body + 1 дрилл
(subject-object-pronouns) с words_resolved и БЕЗ ответов.
