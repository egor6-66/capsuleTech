# Brief — `Ui`-namespace: завести Article (scope `web-core`)

**⚠️ Landing вместе с `article-1-ui.md`.** Инвариант-тест `manifest-path-invariant` требует:
каждый `manifest.type` резолвится в `Ui`. owner-ui добавляет `ui.Article` в manifest → без записи
ЗДЕСЬ тест красный. Зеркало `sectioned-list-2-web-core.md`.

## Задача
`packages/web/runtime/core/src/ui-kit/imports.tsx`:
- Завести **`Article`** в `Ui` (composite поверх Card/Prose/Badge → lazy, как SectionedList):
  ```ts
  export const Article = createLazy(() => import('@capsuletech/web-ui/article'), 'Article');
  ```
- `packages/web/runtime/core/src/wrappers/interfaces.ts` — добавить `Article: typeof Article` в
  `ViewUiRaw` + `WidgetUiRaw` (импорт типа из `@capsuletech/web-ui/article`), как сделано для
  `SectionedList`.
- `ui-meta-props.test.tsx` — compile-гард (callable + IUiMetaProps в ViewUi/WidgetUi), по образцу
  SectionedList-блока.

Инвариант-тест `manifest-path-invariant.test.ts` править НЕ надо — авто-покрывает `ui.Article` →
`Ui.Article`. Зелёный ПОСЛЕ этой правки (до неё красный = связка с article-1-ui).

## Дист-грабля
После правки — пересобрать dist web-core (`nx run @capsuletech/web-core:build`) + рестарт dev
`--force`, иначе рендерер/апп не увидят `Ui.Article`.

## Verify
`nx run @capsuletech/web-core:typecheck` + `:test` (инвариант зелёный) + `:build`.
