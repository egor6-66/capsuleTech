---
tags: [adr, accepted, backend, learn, data-model, lexical-graph, sense, persistence, multi-language]
status: accepted
date: 2026-06-28
last_updated: 2026-06-28
supersedes: []
extends:
  - 055-learning-service-and-thin-app
  - 054-multi-language-platform
---

> [!info] Status: accepted
> Фиксирует **модель данных** lexical-слоя learn-сервиса (`backend/learn` модуль `lang`, фронт-модуль `@capsuletech/web-learn/library`). Центральная единица — **Sense (значение)**, а не Word (строка). Вокруг sense — типизированный граф (теги-группы + направленные связи) + фасеты для фильтра + отдельный пер-юзер слой. Драйвер — кейсы word-explorer / контекстный свап / фасетная выборка / фонетический дрилл / песни→общак / генерация упражнений. Применяется поверх ADR 055 (learn-сервис) и ADR 054 (мультиязычность).

# ADR 064 — Learn lexical graph: sense-centric data-model

## Контекст {#context}

[[055-learning-service-and-thin-app|ADR 055]] заложил `backend/learn` (BFF + plugin-модули) и фронт-зону `@capsuletech/web-learn`, но описал контент lang-модуля плоско (`concept_meta`: id/title/body/exercises). Первый реальный модуль — **library** (лексическая библиотека): коллекция слов с метадатой, тегами-группами, и контекстным ранжированием близких слов.

Кейсы (user → требование к БД):

- **Эксплорер слова (lazy-разворот).** Ввёл слово → дефолт-мета, дальше тогглит синонимы / конструкции / правила / фонетику. → разнотипные связи, подгрузка по требованию; тоггл = категория связи.
- **Обратный поиск «что состоит из слова».** От слова — всё, где оно живёт (песни, конструкции, упражнения, другие слова). → many-to-many + backlinks как первоклассная штука.
- **Умный свап в контексте.** Подмена слова на близкое по смыслу, ранжированное под domain/контекст. → единица = **sense**, не строка; ранжирование по общим тегам/доменам.
- **Фасетная выборка.** «tech-слова уровня L1», «informal глаголы». → фасеты: level / pos / register / domain / frequency.
- **Фонетический дрилл.** «Все слова с θ» → набор → упражнение. → фонетические фичи как теги; группа тегов → генератор упражнений.
- **Песня → общак.** Слова трека скоуплены в песне и промоутятся в глобальные паки. → song ↔ word m2m с формой/контекстом; уровень — на слове.
- **Генерация упражнений.** build-clause / fill-blank тянут слова по тегам/уровню/домену. → слова queryable по фасетам.

### Pain — плоская модель ломается {#pain}

Если теги/связи/мета вешать на слово-**строку**, рассыпается на первом же кейсе: у `bank` два значения (берег / банк) с разными синонимами, доменами, уровнем. Метаданные принадлежат **значению**, не строке. Перевести позже строку-центричную схему на значение-центричную — breaking-рефактор всего графа. Поэтому sense закладывается **сразу**.

## Решение {#decision}

### D1 — Sense как атомарный узел {#d1}

`word` = поверхностная строка (lemma) внутри языка. `sense` = конкретное значение слова. **Теги, связи и фасеты висят на `sense`, не на `word`.** Один `word` → 1..N `sense`. Это WordNet-модель.

### D2 — Одна ось тегов-связей {#d2}

Теги — универсальная ось-джойн (принцип из брифа library): протегованный sense даёт маяки во всё. `tag.kind` — типизированный enum, расширяемый:

`semantic` (synset-группы, близость) · `lexical` (грамматические) · `context` / `domain` (tech, finance…) · `phonetic` (θ, ð… → фонетический дрилл).

`sense_tags(sense_id, tag_id)` — M2M + composite index. **Контекстное ранжирование** = `ORDER BY COUNT(общих тегов) DESC` на этой связке (фильтрация индексируется, ранжирование — агрегация; на масштабах учебного приложения дёшево).

### D3 — Принцип фасетов: column vs tag {#d3}

- **Single-valued интринсик → колонка** на `sense`: `pos`, `level`, `register`, `frequency`. У значения ровно одно → нормализуется в колонку, фильтр типизирован.
- **Multi-valued / открытое → тег**: `domain`, `context`, фонетические фичи. Их много на sense → ось тегов.

Так одна ось остаётся для связей, атрибуты не сваливаются в теги хаотично.

### D4 — Типизированный граф связей {#d4}

`sense_relations(from_sense_id, to_sense_id, type, source)` — направленные типизированные рёбра между значениями. `type` enum (расширяемый): `antonym` · `hypernym` · `hyponym` · `part_of` · `member_of`.

- **Синонимы** моделируются через `semantic`-теги (synset = группа), НЕ дублируются в relations — одна правда. (Отдельная сущность `synset` — при необходимости, аддитивно.)
- **Симметрия:** симметричные типы (antonym) хранят одну строку, запрос смотрит обе стороны (`from = X OR to = X`).
- **Backlinks (обратный поиск)** к НЕ-sense сущностям (song / construction / exercise) — отдельными типизированными junction-таблицами (`sense_songs`, `sense_constructions`…), а не полиморфным FK. Добавляются аддитивно когда сущности появятся; обратный поиск = запрос junction по `sense_id`.

### D5 — Провенанс: auto vs curated {#d5}

`source: auto | curated` на `sense` и `sense_relations`. **Re-seed (ADR 055 D4) обновляет только `auto`-строки по ключу, не трогает `curated`** (ручные нюансы/домены кураторов и пер-юзер слой). Авто-данные — из lang-движка/WordNet (pos, frequency, граф); кураторские — ручная доводка.

### D6 — Lang-scope {#d6}

`sense` (и `word`) ключуются по языку: `lang` (`en_US` на старте; `en_UK` / `ru` / `es` — тем же движком, ADR 054). Граф и теги — внутри языка; кросс-язычные связи (перевод) — отдельный тип ребра позже.

### D7 — Shared canon vs per-user layer {#d7}

Общий датасет (words / senses / tags / relations) — **канон**. Пер-юзер данные (закладки, mastery, свои теги/заметки/списки) — **отдельный слой**: таблицы `user_*` с FK на `sense_id`, НЕ смешиваются с каноном. На MVP single-user (ADR 055 D7), но разделение в схеме — сразу. Это позволяет ре-сидить канон не трогая юзера.

### D8 — Топология persistence {#d8}

- **Старт:** SQLAlchemy 2.0 + Alembic **прямо в `backend/learn`**, SQLite-файл. Извлечение в `packages/shared/data` (ADR 055 D3) — когда появится 2-й Python-сервис с реальной потребностью (YAGNI; ADR 055 D3 «не заводим заранее»).
- **Drop-in SQLite → Postgres** через `DATABASE_URL` (ADR 055 D3).

## Стартовая схема (итерация library-1) {#start-schema}

```
words(id, text, lang)                                    -- lemma/строка
senses(id, word_id→words, gloss?, pos, level?, register?,
       frequency?, lang, source)                         -- атомарное значение + фасеты
tags(id, name, kind)                                     -- kind: semantic|lexical|context|domain|phonetic
sense_tags(sense_id→senses, tag_id→tags)                 -- M2M + index(tag_id, sense_id)
sense_relations(from_sense_id→senses, to_sense_id→senses,
                type, source)                            -- DEFINED, endpoints в следующей итерации
```

**Defined-но-не-строим в этой итерации:** `sense_relations` (таблица есть, ручек нет). **Отложено аддитивно:** `songs`/`constructions`/`exercises` + их sense-junctions (backlinks); `user_*` слой; `synset` как сущность.

## Последствия {#consequences}

### Положительные {#positive}

- Модель не ломается на полисемии, контексте, мультиязычности — sense-центричность заложена сразу.
- Одна ось тегов-связей → фильтр, контекстное ранжирование, фонетический дрилл, кормление генераторов — все через `sense_tags`, без N специализированных механизмов.
- Провенанс защищает кураторскую и юзер-работу от ре-сида.
- Backlinks-сущности и пер-юзер слой добавляются аддитивными миграциями, без рефактора ядра.

### Отрицательные {#negative}

- Sense-уровень = лишний join (`word → sense`) на каждом запросе vs плоская строка. Приемлемо: полисемия неизбежна, denormalize-кэш при необходимости.
- Две оси (теги-группы + типизированные relations) требуют дисциплины «что где живёт» (синонимы → теги, направленное → relations) — зафиксировано в D2/D4.
- Граф-агрегации (ранжирование по общим тегам) тяжелее точечных выборок — на масштабах learn-app незначимо; индексы + лимиты.

### Не делаем (этой итерацией) {#non-goals}

- `sense_relations` endpoints, `synset`-сущность, song/construction/exercise сущности и backlinks, пер-юзер слой — defined/отложено.
- Извлечение `shared/data` (пока в `backend/learn`).
- NLP-обогащение (авто-фонетика/POS из lang-движка) — место заложено (`source=auto`), реализация позже.
- Postgres на dev — SQLite-файл.

## Implementation notes {#impl-notes}

### Iter library-1 (эта) {#iter1}

1. nx/Python-тулинг (ADR 055 foundation-00): namedInputs `pythonSources`, Python CI-job (no-op→подхватит сервис), CLAUDE.md §Commands.
2. `backend/learn` каркас (FastAPI, uv, project.json, port 8003) + SQLAlchemy/Alembic.
3. Alembic-миграция стартовой схемы (D1-D7 таблицы; `sense_relations` defined).
4. Seed пара senses + теги (en_US).
5. Endpoints: `GET /learn/lang/senses` (фасетный фильтр + фильтр по тегам), `GET /learn/lang/sense/{id}` (sense + теги), `GET /learn/lang/senses/related?sense={id}` (ранжирование по общим тегам).
6. **User testing через Postman** → дальше план.

### Дальше (последующие итерации) {#later}

`sense_relations` endpoints → `synset` при нужде → song/construction/exercise + backlinks → пер-юзер слой → NLP-обогащение через lang-движок → извлечение `shared/data` при 2-м сервисе → фронт `@capsuletech/web-learn/library` через `web-query`.

## Cross-references {#cross-refs}

- [[055-learning-service-and-thin-app|ADR 055]] — learn-сервис (родитель): plugin-модули, re-seed, web-query, persistence.
- [[054-multi-language-platform|ADR 054]] — мультиязычность (lang-scope sense).
- Бриф: `docs/_meta/briefs/learn-iter1-web-learn-skeleton.md` — фронт-скелет library-модуля.
