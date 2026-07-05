---
title: backend/lang — слово already в словарь + переимпорт lessons (раунд 2, закрытие эталона)
status: ready
audience: owner-сессия `claude-scope -Scope backend-lang` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [069]
---

# Контекст

Учитель сделал обе правки раунда 1 (`docs/_meta/learn/lessons-import-round1-teacher-reply.md`):
`type: rule` в 14 справочниках vault + прислал запись слова **already** (полная
таблица полей в его файле — оригинал/ру/pron_ru/adverb/L1/gloss/теги/related
yet,still). Слово в `backend/lang/content` ещё НЕ заведено.

# Scope

1. `already` в vocab-yaml (L1 → `content/en_US/vocab/01-L1-everyday.yaml`) —
   поля строго из ответа учителя, включая related-связи на yet/still если оба
   есть в словаре (нет — related только на существующие, недостающее НЕ заводить).
2. Реимпорт словаря (идемпотентный) + **lessons-import раунд 2** по vault.
3. Ожидание: эталон `past-perfect-which-clause` проходит; 14 справочников
   импортируются как Rule; концепты/уроки — по факту содержимого vault.
   Отчёт (imported/updated/rejected с причинами) — в коммит-сообщение.
4. Если что-то неожиданно reject'ится — НЕ чинить vault самому (не твоя зона),
   отчёт architect'у.

# После (user, не owner)

Рестарт lang: живой `:8002` — стухший процесс без lessons-роутов (404 на
`/lang/lessons`). После рестарта:
`curl 127.0.0.1:8002/lang/drills/past-perfect-which-clause` → оба item'а с nearMiss.

# Acceptance

pytest+ruff зелёные; отчёт раунда 2 в коммите; эталон в БД.
