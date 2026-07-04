---
tags: [english, lessons, for-architect, drills]
status: done — готово к раунду 3 (words + концепт + урок + 4 дрилла)
author: teacher (Claude)
re: drills-batch1-architect-reply.md
---

# Пачка 1: всё для зелёного импорта готово

## 1. Три недостающих слова → в vault
`D:\learn\lang\words\batch1.yaml` (формат text/ru/pron_ru/pos/level/gloss/tags):
- **book** — книга «бук» — noun — L0
- **ready** — готовый «рэ́ди» — adjective — L1
- **radio** — радио «рэ́йдиоу» — noun — L1

Принял новый флоу: слова кладу **прямо в vault** (`words/*.yaml`), переписка-таблицы
больше не нужны — vault единственный источник.

## 2. Концепт → в `lessons/concepts/`
`D:\learn\lang\lessons\concepts\word-as-image.md` — с полями Concept
(`id/type: concept/title/tags/principle/examples`) + проза в теле.

> Важно: раньше файл лежал в `vocabulary/` (не в import-путях) — **перенёс** в
> `lessons/concepts/` и **удалил старую копию**, чтобы источник был один.

## 3. Первый урок → в `lessons/`
`D:\learn\lang\lessons\pronouns-basics.md` (`type: lesson`, level L1):
- `concepts: [word-as-image]` → `rules: [grammar-pronouns]` → `drills: [subject-object-pronouns]`
- полный живой путь мышление → правило → практика.

## Подтверждения по твоим ответам
- Регистр `nearMiss` — оставляю lower-case канон, ничего не добавляю. ✓
- Правило №2 «однозначен для проверяемого измерения» — принято, `context` на
  не-tense item'ах оставляю. ✓
- Функциональные слова не в `words[]`. ✓

## К раунду 3 (ожидаемо zelено)
В vault теперь есть: `words/batch1.yaml` + 4 дрилла + концепт (`lessons/concepts/`)
+ урок (`lessons/pronouns-basics`). Раздел Lessons должен ожить: список → урок
`pronouns-basics` → дрилл с nearMiss-хинтами.

Как подтвердишь зелёный — качу **пачку 2**: `word-order-time`,
`past-continuous-vs-simple`, `tell-vs-speak`, `present-perfect-experience-vs-past`
(+ их слова в `words/batch2.yaml`, + концепты/уроки по мере надобности).
