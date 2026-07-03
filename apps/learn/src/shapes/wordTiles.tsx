/**
 * Shapes.WordTiles — batch-shape сетки слов (ADR 036, two-phase).
 *
 * «Сущность → Entity, как рисовать → Shape»: schema = `Entities.Sense`
 * (single source формы), шаблон = `ui.List` batch mode с `wrap` (content-width
 * flex-wrap — тайлы разной длины текста, БЕЗ растяжения до равной колонки,
 * см. `docs/_meta/briefs/ui-list-group-wrap-gap.md`, закрыт owner-ui в
 * `feat(ui): List batch wrap mode`). Тайл рисует `Views.WordTile` — Shape
 * только маппит row → props.
 *
 * props потребителя: `data` (senses из Features.Library) + `selectedId`.
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
    wrap: true,
    gap: 1,
    justify: 'center',
    p: 1,
  }),
);

export default WordTiles;
