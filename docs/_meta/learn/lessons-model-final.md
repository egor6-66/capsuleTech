---
tags: [english, app-design, lessons, spec]
status: final-draft — на утверждение архитектора
author: teacher (Claude)
re: lessons-model-architect-feedback.md
---

# Lessons — финальная модель полей (для схемы + importer'а)

> [!abstract] Финалочка по [[lessons-model-architect-feedback]]: поля
> Concept / Rule / Drill / Lesson, правила именования и валидации importer'а.
> Эталонный дрилл формата — рядом: [[past-perfect-which-clause]].

## Правило №0 — имя файла = id навсегда
- **kebab, тема-первой**, сразу постоянное: `past-perfect-which-clause`,
  `word-as-image`, `do-vs-be-questions`.
- Никаких `temp/wip/new` в имени. Переименование после импорта = разрыв ссылок.
- Все ссылки между сущностями — по этому id.

## Пути vault (куда смотрит importer)
Vault физически: `D:\learn\lang\`.

| Папка | Сущность | Импортится |
|---|---|---|
| `lessons/` | Lesson (пути-сшивки) | да |
| `lessons/concepts/` | Concept (проза-философия) | да |
| `drills/` | Drill (данные) | да |
| `grammar/` | Rule (правила, переиспользуем) | да |
| `phonetics/`, `speech/` | Rule (доп. справочники) | да |
| `methods/`, `briefs/`, `journal/` | дизайн-доки | **нет** |

**Хранилище:** весь lessons-контент — в той же базе, что словарь. Слово в дрилле =
**ссылка на смысл** в словаре (не копия). Нет слова → сначала завести в словарь.

---

## Concept (философия, проза) — `lessons/concepts/*.md`
| поле | тип | req | описание |
|---|---|:--:|---|
| `id` | string (=имя файла) | ✓ | kebab |
| `type` | `"concept"` | ✓ | |
| `title` | string | ✓ | |
| `tags` | string[] | | |
| `principle` | string | ✓ | одна строка — суть тейка |
| `body` | markdown | ✓ | проза, апп рендерит красиво |
| `examples` | { en, ru, image? }[] | | |
| `relatedRules` | ruleId[] | | линки на правила |
| `relatedConcepts` | conceptId[] | | |

Seed: [[word-as-image]].

## Rule (правило, справочник) — `grammar/*.md` (как есть)
| поле | тип | req | описание |
|---|---|:--:|---|
| `id` | string (=имя файла) | ✓ | напр. `grammar-verbs-tenses` |
| `type` | `"rule"` | ✓ | |
| `title` | string | ✓ | |
| `tags` | string[] | | |
| `body` | markdown (таблицы ок) | ✓ | парсится как есть |

Правила уже написаны — добавляем только `type` в frontmatter, тело не трогаем.
Произношение/озвучка слов — **автоматом из словаря**, руками не дублируем.

## Drill (практика, ДАННЫЕ) — `drills/*.md`
Файл = набор дриллов на **одну граблю** (`graboTag`). Поля файла + список `items`.

**Уровень файла:**
| поле | тип | req | описание |
|---|---|:--:|---|
| `id` | string (=имя файла) | ✓ | kebab, обычно = graboTag |
| `type` | `"drill"` | ✓ | |
| `title` | string | ✓ | человеко-читаемое |
| `level` | L0–L5 | ✓ | **рукой**, отдельно от уровня слов |
| `tags` | string[] | | |
| `rule` | ruleId | ✓ | какое правило тренирует (бэклинк «выучить правило») |
| `concept` | conceptId[] | | опц. |
| `graboTag` | string | ✓ | классификатор ошибки (не личная история) |
| `words` | lemma[] | ✓ | слова дрилла → ссылки в словарь |
| `items` | Item[] | ✓ | сами задания |

**Item:**
| поле | тип | req | описание |
|---|---|:--:|---|
| `promptRu` | string | ✓ | русская фраза |
| `context` | string | усл. | мини-ситуация (режим B). **Обязателен, если в `promptRu` нет маркера времени** |
| `answerEn` | string | ✓ | канон-ответ |
| `accept` | string[] | | равноверные варианты (стяжения, порядок) |
| `nearMiss` | NearMiss[] | | точечный фидбек под типовую ошибку |
| `graboTag` | string | | override файлового |

**NearMiss** (фиксация формата):
```yaml
nearMiss:
  - match: contains        # простое вхождение — покрывает ~90% случаев
    pattern: "did eat"
    hint: "…точечная подсказка…"
  - match: regex           # только когда contains не тянет
    pattern: "had( already)? eat(ed)?\\b"
    hint: "…"
```
`match ∈ {contains, regex}`. **Default — `contains`.** По моей практике 90%
ошибок ловятся вхождением; regex — редкие случаи «слово А, но не рядом со словом Б».

## Lesson (путь-сшивка) — `lessons/*.md`
| поле | тип | req | описание |
|---|---|:--:|---|
| `id` | string (=имя файла) | ✓ | kebab |
| `type` | `"lesson"` | ✓ | |
| `title` | string | ✓ | |
| `level` | L0–L5 | ✓ | **рукой** |
| `tags` | string[] | | |
| `intro` | markdown | | короткое вступление |
| `concepts` | conceptId[] | | упорядоченный список |
| `rules` | ruleId[] | | упорядоченный |
| `drills` | drillId[] | | упорядоченный |

Массивы **упорядочены** — это и есть маршрут урока (концепт → правило → дрилл).
Концепты/правила/дриллы — переиспользуемые либы; Lesson только ссылается.

---

## Валидация importer'а (reject с понятной ошибкой)
1. `id` == имя файла, kebab, без `temp/wip`.
2. **Drill.item:** есть маркер времени в `promptRu` **ИЛИ** `context`. Иначе reject
   («промпт неоднозначен по времени — добавь маркер или context»).
3. `words[]` резолвятся в существующие смыслы словаря. Нет → сначала завести слово.
4. Все ссылки (`rule`, `concepts`, `rules`, `drills`, `related*`) резолвятся.
5. `nearMiss.match ∈ {contains, regex}`.

## Сквозное (не описываем в контенте — приходит автоматом)
- **Озвучка** — где есть слово, там звук (движки в шапке аппа).
- **Образ** — поле `image` на смысле + сервис генерации картинок из текста-образа;
  `word-as-image`-проза кормит визуал. Пока поля нет — картинка из слова.
- **Личные грабли / spaced-возврат** — слой аккаунта, контент про них не знает
  (в дрилле только `graboTag`-классификатор).

## Эталон
Формат дрилла целиком лежит **в vault по реальному пути**:
`D:\learn\lang\drills\past-perfect-which-clause.md`
(показывает режим-A с маркером «уже», режим-B с `context`, и оба типа `nearMiss` —
`contains` + `regex`). Это канон, по которому пишется importer и валидатор.
