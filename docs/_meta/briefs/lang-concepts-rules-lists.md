---
title: backend/lang — списки concepts/rules + дриллы-по-правилу (ИА раздела Lessons, iter 1)
status: ready
audience: owner-сессия `claude-scope -Scope backend-lang` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [069]
---

# Контекст

Решение user: раздел Lessons = вкладки «Концепты» (библиотека философии) и
«Правила» (справочник, у каждого правила — ЕГО дриллы через связь drill.rule);
уроки-маршруты вернутся позже. Detail-эндпоинты уже есть; не хватает списков
и выборки дриллов по правилу.

# Scope (backend/lang)

1. `GET /lang/concepts` → `{concepts: [{id, title, principle, tags}]}` (сорт title).
2. `GET /lang/rules` → `{rules: [{id, title, tags}]}` (сорт title).
3. `GET /lang/rules/{id}` — уже есть? если нет — добавить (полное тело).
4. `GET /lang/drills?rule={id}` → `{drills: [...]}` полные (items+nearMiss),
   сорт level,title. Пустой список — валидный ответ.
5. Тесты на 4 формы + пустые случаи.

# Acceptance

pytest+ruff зелёные; live: `/lang/rules` отдаёт 14, `/lang/drills?rule=grammar-verbs-tenses`
отдаёт 3 (past-perfect, do-vs-be, be-drop), `/lang/concepts` отдаёт word-as-image.
