---
tags: [english, lessons, for-architect, drills]
status: ready — на переимпорт (раунд 2+)
author: teacher (Claude)
re: lessons-model-final.md
---

# Дриллы, пачка 1 — 4 файла по формату эталона

> [!info] Написаны по [[lessons-model-final]] и эталону
> `D:\learn\lang\drills\past-perfect-which-clause.md`. Каждый = одна грабля.

## Файлы (в `D:\learn\lang\drills\`)
| файл / id | graboTag | rule | level | items |
|---|---|---|:--:|:--:|
| `do-vs-be-questions` | do-vs-be-questions | grammar-verbs-tenses | L2 | 4 |
| `subject-object-pronouns` | subject-object-pronouns | grammar-pronouns | L1 | 4 |
| `be-drop` | be-drop | grammar-verbs-tenses | L1 | 4 |
| `articles-basic` | articles-basic | grammar-articles | L2 | 4 |

Все `rule:` теперь резолвятся (справочники получили `type: rule` в раунде 1).

## Слова на сверку со словарём (добавить недостающие штатным флоу)
Уникальные content-слова из `words[]` пачки:
```
understand, work, like, coffee, late, book, give, tell,
tired, ready, student, movie, radio, TV
```
- Функциональные слова (me/him/us/them/he/i/we, for/about, a/the) в `words[]` НЕ
  выношу — они обслуживаются правилами (`grammar-pronouns`, `grammar-articles`),
  не словарными карточками. Если importer ждёт их как слова — скажи, поправлю.
- `coffee` точно есть (song-vocab). Остальные — проверь; недостающие заведём как
  `already`.

## Два нюанса на твоё решение

### 1. Регистр в `nearMiss.pattern`
Паттерны написаны **в нижнем регистре** (`"he don't"`, `"a coffee"`). Рассчитываю,
что апп **нормализует ввод к lower-case** перед матчем. Если матч регистро-зависимый
— скажи, добавлю варианты или договоримся о нормализации на стороне аппа.

### 2. Валидатор «маркер ИЛИ context» — уточнение под не-tense грабли
Правило родилось для **времён** (снять неоднозначность времени). Но для
`pronouns / articles / be-drop` переменная — не время, и требовать маркер времени
искусственно. Что я сделал: **навесил `context` на каждый не-tense item** — они
проходят валидатор как есть. 

Предложение на будущее: переформулировать правило как «промпт **однозначен для
проверяемого измерения**» — для времён это маркер/контекст, для остальных граблей
достаточно, что фраза не двусмысленна. Тогда короткие императивы («Дай им книгу»)
не потребуют искусственного контекста. Пока — не блокер, всё валидно.

## После импорта
Как позеленеют — готов лепить пачку 2: `word-order-time` (обстоятельство времени в
конец), `past-continuous-vs-simple` (фон vs точка), `tell-vs-speak` (сочетаемость),
`present-perfect-experience-vs-past` (опыт vs точное «когда»).
