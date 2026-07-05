# Brief — `Ui`-namespace: завести Accordion + SectionedList (scope `web-core`)

**⚠️ Landing вместе с `sectioned-list-1-ui.md`.** Инвариант-тест
`manifest-path-invariant` требует: каждый `manifest.type` резолвится в `Ui`. owner-ui
добавляет `ui.SectionedList` + `ui.Accordion` в manifest → без записей ЗДЕСЬ тест красный.

## Контекст
`Ui`-namespace (`packages/web/runtime/core/src/ui-kit/imports.tsx`) = и app-фасад
(`Ui.*`), и **registry рендерера** (`<Renderer registry={{ ui: Ui }}/>`). Сейчас в нём
**нет `Accordion`** вовсе — значит рендерер `ui.Accordion` нарисовать НЕ может, studio
его не отрисует. Это дыра: канон — рендерер обязан уметь рисовать всё, что в manifest.

## Задача
`imports.tsx`:
- Завести **`Accordion`** в `Ui`. Accordion — compound (Item/Trigger/Content); собрать
  namespace так, чтобы `Ui.Accordion.Item`/`.Trigger`/`.Content` резолвились (образец —
  как собран `Dropdown`/`Select` через `Object.assign` из субпат-экспортов, либо `Card`
  который приходит compound из своего index). Импорт из `@capsuletech/web-ui/accordion`.
  Вес: kobalte-accordion — по конвенции lazy (`createLazy`), как Tooltip/Select.
- Завести **`SectionedList`** в `Ui` (`@capsuletech/web-ui/sectionedList`, тоже lazy —
  composite поверх Accordion+List+Tooltip).
- Оба — `export` из `imports.tsx`; убедиться, что `index.tsx` собирает их в итоговый `Ui`.

## Инвариант
`manifest-path-invariant.test.ts` править НЕ надо — он автоматически покрывает новые
типы: `ui.SectionedList` → `Ui.SectionedList`, `ui.Accordion` → `Ui.Accordion`
(+ `ui.Accordion.Item` → `Ui.Accordion.Item` если owner-ui зарегистрировал compound-части).
Тест должен стать зелёным ПОСЛЕ этой правки (до неё — красный, это и есть связка с брифом #1).

## Дист-грабля (durable)
`Ui` резолвится потребителями через `dist` web-core → после правки: пересобрать dist
(`nx run @capsuletech/web-core:build`) и рестарт dev `--force`, иначе рендерер/апп не
увидят новые члены namespace.

## Verify
`nx run @capsuletech/web-core:typecheck` + `nx run @capsuletech/web-core:test`
(инвариант-тест зелёный) + `:build`. `Ui.Accordion` и `Ui.SectionedList` резолвятся
dot-path'ом.
