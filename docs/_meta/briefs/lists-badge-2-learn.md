# Brief 2/2 — learn: списки на Ui.List + бейджи на Ui.Badge (scope `learn`)

**Дедуп списков+бейджей (канон [[feedback_product_wide_kit_layering]]).** learn = данные+композиция, ноль хендролла/классов. Ждёт brief 1 (Ui.Badge). Ui.List **уже существует** (batch/wrap/virtual) — просто используем его вместо `Flex`+`For`.

## Часть A — списки на `Ui.List` (batch-режим, ADR 036)

Сейчас `Layout.Flex` + `For` хендроллятся. Перевести на `Ui.List` с инжектом item-шаблона:

- **`lessons/List.tsx`** → вертикаль. Извлечь item в `lessons/LessonCard.tsx` (Card interactive/selected + title + level-Badge + tags-Badge). Затем:
  ```tsx
  <Ui.List data={lessonsStore.lessons()} item={{ use: LessonCard, props: (l) => ({
    lesson: l, selected: lessonsStore.selectedId() === l.id, onSelect: handleSelect,
  }) }} />
  ```
  `onMount` lazy-load + `handleSelect`+emit — остаются в блоке (композиция/данные).
- **`library/Words.tsx`** → `wrap`-грид: `<Ui.List wrap justify="center" data={senses()} item={{ use: WordTile, props: (s) => ({ sense: s, selected: ..., onSelect, onSpeak }) }} />`. `WordTile` уже отдельный — годится как `item.use`.
- **`library/VocabList.tsx`** — SKELETON-stub, **удалить** (снять из `capsule.ts` `components`, из `index.ts`/exports, tsconfig.base — скажи architect'у про снятый субпат если был).

## Часть B — все ad-hoc бейджи → `Ui.Badge`

Заменить паттерн `Card padding="sm" + Typography muted` на `Ui.Badge`:
- `lessons/LessonCard` (бывш. List): level → `<Ui.Badge tone="muted">{level}</Ui.Badge>`; теги → `<Ui.Badge tone="muted">#{tag}</Ui.Badge>` (унифицирует с Info!).
- `library/Info.tsx`: теги → `Ui.Badge` (тот же вид, что в списке — divergence уходит).
- `lessons/Concept.tsx`: rule-чипы → `<Ui.Badge interactive selected={...} onClick={...}>`.
- `lessons/Drill.tsx`: `WordChip` → `Ui.Badge interactive` (+ 🔊 рядом; если чип со звуком — Badge interactive + отдельная speak-кнопка, не сливать).
- `TypeErrorBadge` (если это Card-пилюля) → `Ui.Badge tone="outline"` или подходящий tone.

После — в learn **ноль** `Card padding="sm"`-бейджей и ноль сырых классов на бейджах.

## Verify
`nx run @capsuletech/web-learn:test --skip-nx-cache` + `:typecheck` + `:build`. Тесты, завязанные на старую разметку бейджей/списков (напр. `chip`-селекторы в Concept.test) — обновить под Ui.Badge/Ui.List разметку. Визуал списков/бейджей теперь из кита → пиксельно консистентен.

## Анатомия (по ходу)
`lessons/LessonCard.tsx` — новый item-компонент рядом с List. Это нормально (item-шаблон = презентация модуля). Полную перекладку core/+modules/ — отдельно.
