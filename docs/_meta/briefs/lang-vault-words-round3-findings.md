---
title: backend/lang — round 3 отчёт + 2 блокера на решение (batch1-формат + валидатор)
status: awaiting-user (миграция сделана; live-раунд упёрся в 2 корня)
audience: user (передать: блокер A → учителю, блокер B → architect-решение)
last_updated: 2026-07-05
adr_refs: [069, 070]
parent_brief: lang-vault-words-round3.md
---

# Что уже сделано (owner-backend-lang, закоммичено)

Ветка `feat/wave-image-lessons`, 3 коммита (commit-only, push за architect):

1. `b373fee5` **feat: full vault import (words → lessons одной командой)** — `vault_import.py`
   оркестрирует раунд: `{vault}/words/*.yaml` через lexical-importer (`source: curated`,
   идемпотентно) → потом lessons-граф. Порядок жёсткий: дриллы резолвят `words[]`
   против словаря. nx-таргет `import-vault`. Фикстура + тесты.
2. `f25c9d80` **refactor: content/ удалён из репо — контент только в vault (ADR 070)** —
   `content/en_US/{vocab,seed}` удалены (vocab уже в vault, хэши сверены — идентичны);
   `src/capsule_lang/{seed,vocab}.py` удалены; seed-корпус (6 senses) → тест-фикстура
   `tests/fixtures/senses/seed.yml` + helper `tests/seed_fixture.py`; nx-таргеты
   `seed`/`import-vocab` убраны; README/OWNERSHIP обновлены.

**pytest 37 passed, ruff clean.** Vault-сторона (words/ 4 корпуса + batch1, lessons/,
lessons/concepts/) на месте.

# Live round 3 — фактический отчёт

Команда: `uv run python -m capsule_lang.vault_import D:\learn\lang` (инкремент, live-БД —
сервер :8002 держал lang.db, fresh-rebuild рискнул бы файловым локом).

```
words:   imported=0 updated=171 skipped=3
lessons: imported=1 updated=15 rejected=5
```

Живой API сейчас:
- `GET /lang/lessons` → **`{"lessons":[]}`** (пусто).
- `GET /lang/concepts/word-as-image` → **200 ✓** (концепт импортирован).
- `GET /lang/drills/past-perfect-which-clause` → **200 ✓** (эталон жив).
- `GET /lang/senses?q=radio` → **`{"senses":[]}`** (нет в словаре).

**Прошло:** 4 корпуса (171 sense updated), концепт `word-as-image`, все 14 rule-справочников,
эталонный дрилл. **Не выполнено** ожидание «все 5 дриллов + урок pronouns-basics» — по двум
корневым причинам ниже. По канону (§0 без костылей; surface-don't-chase) не глушу их и не
правлю vault сам — фиксирую на решение.

---

# 🔴 Блокер A — `batch1.yaml` в неверном формате (vault-контент, зона учителя)

Бриф round-3 п.1: words = «тот же формат, что `content/en_US/vocab/*.yaml`». Но
`D:\learn\lang\words\batch1.yaml` (book / ready / radio) написан в ДРУГОМ формате —
3/3 блока падают на `SenseIn`-валидации. Точный вывод валидатора (каждый блок):

```
- word  :: Field required
- level :: Input should be 'a1','a2','b1','b2','c1' or 'c2'
- tags.0 :: Input should be a valid dictionary or instance of TagIn
- tags.1 :: Input should be a valid dictionary or instance of TagIn
```

| в batch1.yaml (сейчас) | канон vocab-пака (`SenseIn`) |
|---|---|
| `text: book` | **`word: book`** |
| `level: L0/L1` (это LessonLevel) | **CEFR `a1..c2`** — или **опустить** (корпус level не ставит, обогащение позже) |
| `tags: [object, everyday]` (bare strings) | **`tags: [{name: object, kind: domain}]`** (`TagKind` = field/domain/tier/phonetic/lexical) |
| `pron_ru: «бук»` (гильеметы) | стиль корпуса — без «»: `pron_ru: "бук"` |

Следствие: book/ready/radio не заводятся → дрилл `articles-basic` reject (`radio нет в словаре`).

**Почему не мой фикс:** importer корректно держит `SenseIn`-канон (ADR 064-A). Ослабить схему
под `text`/bare-tags/LessonLevel — костыль поверх канона (нарушение POLICY §0). Чинится
переписыванием `batch1.yaml` в vault под vocab-формат. Референс — любой из
`D:\learn\lang\words\00-L0-core.yaml` (`{word: also, lang: en_US, pos: adverb, ru: "тоже",
pron_ru: "о́лсоу", image: "...", tags: [{name: core, kind: tier}]}`).

### Готовый корректный `batch1.yaml` (положить в `D:\learn\lang\words\`)

```yaml
# Словарные записи из дрилл-пачки 1 — недостающие. Формат = vocab-пак (SenseIn / ADR 064-A).
- {word: book,  lang: en_US, pos: noun,      ru: "книга",   pron_ru: "бук",     gloss: "a set of printed pages bound together; something you read", tags: [{name: object, kind: domain}, {name: everyday, kind: domain}]}
- {word: ready, lang: en_US, pos: adjective, ru: "готовый", pron_ru: "рэ́ди",   gloss: "prepared; able to do something now",                        tags: [{name: state, kind: domain}]}
- {word: radio, lang: en_US, pos: noun,      ru: "радио",   pron_ru: "рэ́йдиоу", gloss: "a device/medium that broadcasts sound (listen to the radio)", tags: [{name: object, kind: domain}, {name: media, kind: domain}]}
```

(`level` намеренно опущен — корпус его не несёт, CEFR-обогащение отдельной волной. `pos:
adjective`/`noun` нормализуются в `adj`/`noun` синонимами. Если хочешь CEFR сразу — скажи
уровни, добавлю `level: a1/a2`.)

---

# 🔴 Блокер B — валидатор времени режет НЕ-tense дриллы (бриф это ОТЛОЖИЛ)

Дриллы `be-drop`, `do-vs-be-questions`, `subject-object-pronouns` reject'нутся на item[0]:
`промпт неоднозначен по времени — добавь маркер/context`. **При этом `context` у item[0] есть.**

Причина: `lessons_importer._validate_drill_item` требует **токен-маркер времени** (regex по
словарю `_TIME_MARKERS`) внутри `promptRu ∪ context`. Наличие поля `context` само по себе НЕ
засчитывается — маркер должен НАЙТИСЬ в тексте. Учительский context не-tense дриллов
(«Отвечаешь на «как ты?» после тренировки») маркера не содержит → reject.

Каскад: урок `pronouns-basics` ссылается на `subject-object-pronouns` → тот rejected →
урок тоже rejected → `GET /lang/lessons` пуст.

**Статус по брифу:** раздел «Что НЕ делаем» родительского брифа явно отложил ослабление:
«Валидатор … НЕ ослабляем … отдельным решением позже». Т.е. текущий reject СООТВЕТСТВУЕТ
брифу. Ожидание «все 5 дриллов проходят» требует **снять эту отсрочку** — это твоё/architect
решение (валидатор в моей зоне `lessons_importer`, но менять его сейчас бриф запретил).

Предложение учителя (`drills-batch1-for-architect.md` §2), которое надо принять/отклонить:
переформулировать правило как «промпт **однозначен для проверяемого измерения**»:
- **tense-дрилл** → по-прежнему нужен маркер времени в promptRu или context;
- **не-tense** (pronouns/articles/be-drop) → достаточно наличия `context` (или вообще снять
  требование для не-tense).

**Что нужно для реализации (если снимаем отсрочку):** точный признак «это tense-дрилл vs
не-tense». Варианты: (а) по `rule`-ссылке (`grammar-verbs-tenses` → tense; иначе — нет);
(б) явный флаг во frontmatter дрилла (напр. `dimension: tense|other`); (в) по `graboTag`.
Нужно твоё решение по критерию — без него переформулировка недоопределена.

---

# После решений — план добивки (owner-backend-lang)

1. Блокер A решён (batch1 переписан в vault) → перегнать `vault_import` → book/ready/radio
   в словаре, `articles-basic` проходит.
2. Блокер B: если отсрочка снята с критерием → правлю `_validate_drill_item` + тест на
   не-tense-дрилл-с-context → перегнать → be-drop/do-vs-be/subject-object проходят →
   `pronouns-basics` импортируется → `GET /lang/lessons` непустой.
3. Верификация: :8080/learn/lessons — живой путь концепт → правило → дрилл. Рестарт lang
   не нужен (--reload; данные читаются пер-реквест).

# Что осталось прежним (не менять)

- Миграция контента в vault и удаление из репо — сделано, не откатывать.
- vault-контент (drills/grammar/lessons/…) — зона учителя, не правлю сам; правки по «ок».
