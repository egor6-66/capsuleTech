---
tags: [adr, accepted, backend, lang, lessons, content, importer]
status: accepted
date: 2026-07-04
last_updated: 2026-07-04
supersedes: []
extends:
  - 064-lexical-graph-data-model
  - 067-backend-capability-services-lang-voice
---

> [!info] Status: accepted
> Учебный контент (Concepts / Rules / Drills / Lessons) живёт в **lang** — той же
> БД, что лексический граф. Авторство — vault учителя, доставка — importer
> (`source: curated`), модель полей — `docs/_meta/learn/lessons-model-final.md`
> (утверждена 2026-07-04), эталон формата — дрилл `past-perfect-which-clause`
> в vault. Личный прогресс/грабли юзера — НЕ здесь (будущий user-домен).

# ADR 069 — Lessons-контент в lang: модель, vault-importer, фазы

## Контекст {#context}

Раздел Lessons (бриф учителя `brief-lessons-section` + финалочка
`lessons-model-final`): три библиотеки переиспользуемого контента — Концепты
(проза-mindset), Правила (справочник), Дрилы (данные практики) — и Lesson как
упорядоченный путь-сшивка ссылками. Канон: урок заканчивается деланием.

## Решение {#decision}

### D1 — Хранилище: lang, не отдельный сервис {#d1}

Контент уроков = язык-домен. Дрилы прошиты словами насквозь (`words[]` →
смыслы словаря, слово = join-key), уровни L0–L5 общие со словарём, importer-
пайплайн (`source: curated`) уже существует. Отдельный `backend/lessons` дал бы
чистую зону ценой cross-service join'ов — отклонён. learn-BFF остаётся
stateless-композитором (ADR 067): собирает урок + слова + озвучку + картинки.

### D2 — Модель: 4 сущности по финалочке {#d2}

Поля — single source of truth в `lessons-model-final.md`. Ключевое:
- **Drill-файл** = набор item'ов на ОДНУ граблю (`graboTag` — классификатор,
  НЕ личная история). Item: `promptRu / context? / answerEn / accept[] /
  nearMiss[] / graboTag?`.
- **`nearMiss.match ∈ {contains, regex}`**, default `contains` — точечный
  фидбек фазы 2 работает rule-based, LLM-проверка позже как pluggable-движок.
- **Lesson**: упорядоченные `concepts[] / rules[] / drills[]` = маршрут.
  `level` — рукой, отдельно от уровня слов.
- Имя файла = id навсегда (kebab, тема-первой).

### D3 — Importer: vault → lang {#d3}

Markdown+frontmatter из vault учителя. Путь vault — **конфигом**
(`LESSONS_VAULT`, air-gapped канон: никаких хардкод-путей; dev-значение
`D:\learn\lang`). Папки: `lessons/`, `lessons/concepts/`, `drills/`,
`grammar|phonetics|speech/` (Rules); `methods|briefs|journal/` — не импортятся.
Валидация — reject с понятной ошибкой (5 правил финалочки; главное: drill-item
без маркера времени И без `context` невалиден; `words[]` обязаны резолвиться
в словарь). Идемпотентен, как teacher-vocab.

### D4 — Образ (word-as-image → данные) {#d4}

Поле `image` (текст-образ) на смысле + `bridge` (образ-мост) на связи смыслов.
Конвейер: учитель пишет образ → lang хранит → `backend/image` рендерит →
learn композитит `image.url` (сейчас prompt = текст слова, переключается на
образ с этой миграцией).

### D5 — Фазы {#d5}

1. **Read-only:** схема + importer + `GET /lang/lessons[,/{id}]` (композиция
   refs) → learn-BFF → `Learn.Lessons.*` блоки (путь: проза → правило → дрилл
   текстом).
2. **Интерактив:** ввод RU→EN, проверка `answerEn/accept`, точечный фидбек
   `nearMiss` (rule-based). Проверка = pluggable seam (LLM-судья потом).
3. **Личные грабли:** user-домен (auth-сессия готова, ADR 068), append-only
   события, spaced-возврат. Отдельный ADR.

## Последствия {#consequences}

**Плюсы:** SQL-join дрилл↔словарь; один importer-флоу; learn-топология не
меняется; фидбек фазы 2 без ML-зависимостей. **Цена:** lang выходит за рамки
«чисто lexical» (осознанно: lang = язык-домен целиком); vault-структура
становится контрактом (правило №0 — имена = id).
