---
title: backend/lang — words/ в vault (консолидация контента учителя) + импорт пачки дриллов 1
status: ready (частично блокирован контентом: учитель докладывает words/batch1.yaml + concept + lesson)
audience: owner-сессия `claude-scope -Scope backend-lang` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [069]
---

# Контекст

Решение user: контент учителя НЕ размазываем — vault (`LESSONS_VAULT`) =
единственная авторская зона, ВКЛЮЧАЯ новые слова. Пачка дриллов 1 уже в vault
(4 файла, см. `docs/_meta/learn/drills-batch1-for-architect.md`); недостающие
слова (book/ready/radio — сверено architect'ом по живому API) учитель кладёт
в `{vault}/words/*.yaml`.

# Scope (backend/lang)

1. **Vault-words в importer'е**: `{LESSONS_VAULT}/words/*.yaml` — тот же
   формат, что `content/en_US/vocab/*.yaml`, тот же upsert-пайплайн
   (`source: curated`). Прогонять ПЕРЕД lessons-импортом (дриллы резолвят
   слова). Единая команда «полный импорт vault» (words → lessons) — чтобы
   раунд был одной командой; README обновить.
2. **Роль repo `content/en_US/vocab/`** — становится bootstrap-seed
   (историческим): новые слова туда НЕ добавляются, существующее не трогаем.
   Зафиксировать в OWNERSHIP.
3. **Раунд 3 live**: полный импорт vault — ожидание: 3 слова + 4 дрилла пачки
   (do-vs-be-questions, subject-object-pronouns, be-drop, articles-basic) +
   concept word-as-image + первый lesson (учитель докладывает). Отчёт
   (imported/updated/rejected+причины) — в коммит. Если контент учителя ещё
   не доложен — импортировать что есть, честный отчёт, НЕ чинить vault самому.
4. Тесты: words-фикстура в tests/fixtures/vault/words/, upsert идемпотентен,
   порядок words→lessons в единой команде.

# Acceptance

pytest+ruff зелёные; после раунда 3: `GET /lang/lessons` непустой (если lesson
доложен), дриллы пачки отдаются с items/nearMiss; фронт (:8080/learn/lessons)
показывает первый урок.

# Что НЕ делаем

- Валидатор «однозначен для измерения» НЕ ослабляем (принято текстом финалочки,
  код по-прежнему: маркер ИЛИ context) — отдельным решением позже.
- Не трогаем чужой vault-контент.
