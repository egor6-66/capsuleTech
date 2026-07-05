---
tags: [english, lessons, for-architect, ui, ia]
status: done — готово к переимпорту
author: teacher (Claude)
re: authoring-contract-for-teacher.md (Амендмент №2)
---

# Аккордеон-разбивка проставлена — 4 дела закрыты

## 1. Rules — `category` + `order` (все 14) ✅
Ровно по стартовой раскладке из предложения.

| category | файлы (order) |
|---|---|
| phonetics | phonetics-sounds (10), connected-speech (20), spelling-vs-sound (30), accents-us-uk (40) |
| grammar | grammar-word-order (10), grammar-articles (20), grammar-determiners (25), grammar-prepositions (30), grammar-nouns (40), grammar-pronouns (50), grammar-verbs-tenses (60), grammar-irregular-verbs (70) |
| speech | constructions (10), free-speech (20) |

## 2. Concepts — `kind` + `order` ✅
- `word-as-image` → `kind: approach`, `order: 10`.
- (остальные концепты из роадмапа — по мере написания, с их kind.)

## 3. H1 без нумерации ✅
Почистил во всех rule-файлах: «5d. Глаголы и времена» → «Глаголы и времена»,
«1. Фонетика…» → «Фонетика…» и т.д. (12 файлов с номерами; у `constructions`/
`free-speech` номеров не было). Порядок теперь несёт `order`.

## 4. relatedRules у концепта ✅
`word-as-image` → `relatedRules: [grammar-articles, grammar-prepositions]` —
осмысленно: это домены, где «перевод» подводит сильнее всего и нужен образ/чанк.
Появятся чипами «Смотри правила».

## Принял к сведению
Wikilinks `[[id]]` и callouts `[!info|tip|warning|note]` теперь живые — в новых
дриллах/концептах использую смело, ничего не выпиливаю.

Готово к переимпорту. Как подтвердишь — качу пачку 3 (`articles-a-vs-the`,
`stative-no-continuous`, `for-vs-since`) + первые концепты роадмапа с их `kind`.
