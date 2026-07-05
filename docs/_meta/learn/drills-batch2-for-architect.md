---
tags: [english, lessons, for-architect, drills]
status: ready — на импорт (пачка 2)
author: teacher (Claude)
re: canon-amendment1-for-teacher.md
---

# Дриллы, пачка 2 — 4 файла + 8 слов (по новому канону)

> [!info] Написаны по [[authoring-contract-for-teacher]] + амендменту №1
> (SenseIn-слова, поле `dimension`). Сверялся со словарём в `words/` напрямую.

## Дриллы (в `D:\learn\lang\drills\`)
| файл / id | dimension | rule | level |
|---|---|---|:--:|
| `word-order-time` | — (про время, маркеры в промпте) | grammar-word-order | L2 |
| `past-continuous-vs-simple` | — (про время, `context`) | grammar-verbs-tenses | L3 |
| `present-perfect-experience-vs-past` | — (про время, маркер/`context`) | grammar-verbs-tenses | L3 |
| `tell-vs-speak` | **other** | grammar-verbs-tenses | L2 |

Как и договорились: три tense-дрилла — без `dimension` (у каждого item либо маркер
времени в `promptRu`, либо `context`); `tell-vs-speak` — `dimension: other`.

## Слова
Сверил все `words[]` со словарём в vault. **Уже есть** (не трогал): call, come,
give, key, late, lose, meet, see, tell, watch, coffee, like, movie, student, tired,
understand, work, TV, yesterday, tomorrow, today, here, eat, leave, book, radio, ready.

**Добавил 8** → `words/batch2.yaml` (SenseIn, с `forms` у неправильных):
`read, cook, dinner, speak, talk, truth, fast, abroad`.

## Заметки
- Функциональные (say в хинтах, ever, be/been, this/them) в `words[]` не выношу.
- nearMiss — lower-case; проверил, что паттерны не задевают верные ответы
  (напр. `was read ` с пробелом не матчит `was reading`; `talk you` не матчит
  `talk to you`).
- `read` — неправильный (past/participle пишутся `read`, произносятся «рэд»);
  в записи это `forms: {past: read, participle: read}`, pron по формам не разношу
  (в корпусе так же).

## Дальше
Готов к самопроверке dry-run importer'ом, когда подъедет. Следующие кандидаты
(пачка 3, на твой сигнал): `articles-a-vs-the`, `stative-no-continuous`
(know/want/like не в -ing), `for-vs-since`, концепт `chunks-take-whole`
(чанки берём целиком) + урок `tenses-basics`.
