/**
 * Shapes.WordTiles — batch-shape сетки слов (ADR 036, two-phase).
 *
 * «Сущность → Entity, как рисовать → Shape»: schema = `Entities.Sense`
 * (single source формы), шаблон = `ui.List` batch mode. Тайл рисует
 * `Views.WordTile` — Shape только маппит row → props.
 *
 * props потребителя: `data` (senses из Features.Library) + `selectedId`.
 *
 * GAP kit'а (флаг architect'у, брифа ещё нет): нужен content-width
 * wrapping-layout (тайлы разной длины текста, авто-перенос по ширине
 * контейнера, БЕЗ растяжения до равной колонки). `List` batch: `min` →
 * CSS-grid `minmax(min,1fr)` растягивает все items до равной ширины колонки
 * (не то); flex-режим без `min` — `flex-row gap-2`, нет `wrap`-варианта в
 * listVariants. `Group` batch-режим ВСЕГДА делегирует в `Resizable`
 * (spaced/resizable pane-раскладка), даже non-resizable non-attached путь —
 * не content-flow. Ни один существующий batch-примитив не даёт
 * flex-wrap+content-width одновременно. Временно оставлено `min: '9rem'`
 * (известная визуальная регрессия — тайлы стретчатся вместо контентной
 * ширины), НЕ обходить raw-class'ом — ждёт брифа owner-ui.
 */
const WordTiles = Shape(
  (ui, { zod }) => ({
    schema: zod.array(Entities.Sense.schema),
    as: ui.List,
  }),
  (_ui, props) => ({
    item: {
      use: Views.WordTile,
      props: (it) => ({
        sense: it,
        selected: (props as { selectedId?: number | null }).selectedId === it.id,
      }),
    },
    min: '9rem',
    gap: '0.5rem',
  }),
);

export default WordTiles;
