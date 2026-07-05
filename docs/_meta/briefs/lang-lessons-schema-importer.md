---
title: backend/lang — lessons-схема (4 сущности) + vault-importer + образ-поля + read-only API (ADR 069 ф.1)
status: ready
audience: owner-сессия `claude-scope -Scope backend-lang` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [064, 067, 069]
---

# Контекст

ADR 069 принят: учебный контент живёт в lang. **Single source of truth полей —
`docs/_meta/learn/lessons-model-final.md`** (утверждена). Эталон формата дрилла —
`{LESSONS_VAULT}/drills/past-perfect-which-clause.md` (реальный файл в vault,
dev-путь `D:\learn\lang`). Этот бриф = фаза 1 целиком: схема + importer +
read-only API.

# Scope (backend/lang)

## 1. Схема (alembic-миграция)

- `concepts` / `rules` / `drills` (+`drill_items` с JSON-полями `accept`,
  `near_miss`) / `lessons` (+ упорядоченные связи lesson→concept|rule|drill —
  M2M с `position`). Поля — строго по финалочке, ничего не изобретать.
- `drills.words` → M2M на **words** словаря (резолв lemma → word; sense-уровень
  не требуется — дрилл ссылается на слово).
- **Образ (ADR 069 D4):** `senses.image` (nullable text, образ-метафора) +
  `sense_relations.bridge` (nullable text, образ-мост). Данных пока нет — поля
  готовят конвейер.
- `native_enum=False`, id-строки = kebab-id из имён файлов (правило №0).
- `source: curated` provenance как у teacher-vocab.

## 2. Importer (расширение существующего пайплайна)

- Путь vault — env `LESSONS_VAULT` (default `D:\learn\lang` только в README,
  НЕ в коде — air-gapped). Папки/маппинг — таблица финалочки
  (`methods|briefs|journal` игнор).
- Markdown + YAML-frontmatter; `type` — дискриминатор. Body (markdown) хранить
  как есть — рендерит фронт.
- **Валидация — reject с ПОНЯТНОЙ ошибкой (файл+причина), не молчаливый скип:**
  1. id == имя файла, kebab, без temp/wip;
  2. drill-item: маркер времени в promptRu ИЛИ context — эвристика маркеров
     v1 = словарь-список (уже/вчера/сейчас/когда-то и т.п.) в коде с комментом
     «расширяемый»; при сомнении лучше false-negative (reject) чем пропуск;
  3. `words[]` резолвятся в словарь (нет слова → reject с «сначала заведи слово»);
  4. все ref'ы (rule/concepts/rules/drills/related*) резолвятся;
  5. `nearMiss.match ∈ {contains, regex}` (default contains), regex —
     компилируется (re.compile try → reject при ошибке).
- Идемпотентность: повторный импорт = upsert по id.
- Итоговый отчёт: imported/updated/rejected(с причинами).

## 3. Read-only API (фаза 1)

- `GET /lang/lessons` → список `{id,title,level,tags}` (сортировка level,title);
- `GET /lang/lessons/{id}` → композиция: intro + упорядоченные полные
  concepts/rules/drills (drill c items целиком);
- `GET /lang/drills/{id}`, `GET /lang/concepts/{id}` — прямой доступ.
- Ничего интерактивного (проверка ответов = фаза 2, НЕ сюда).

## 4. Тесты

Схема-smoke; importer: happy-path на копии эталонного дрилла в fixtures +
все 5 reject-правил (по кейсу на каждое); API: lesson-композиция сохраняет
порядок. Реальный vault в тестах НЕ используется (fixtures в репо).

# Acceptance

- `uv run alembic upgrade head` на чистой БД ок; `uv run pytest` + ruff зелёные.
- Live: импорт реального vault (`LESSONS_VAULT=D:\learn\lang uv run python -m
  capsule_lang.importer …` — команду показать в README) → эталонный дрилл в БД,
  `GET 127.0.0.1:8002/lang/drills/past-perfect-which-clause` отдаёт оба item'а
  с nearMiss. Отчёт импорта приложить в коммит-сообщение (сколько rejected и почему —
  ожидаемо: часть grammar/* без `type` поля до правки учителя).

# Что НЕ делаем

- Проверку ответов/интерактив (фаза 2), личные грабли (фаза 3).
- learn-BFF композицию уроков (следующий бриф backend-learn после этого).
- НЕ трогаем существующие sense-эндпоинты и teacher-vocab пайплайн (регрессы — стоп).
