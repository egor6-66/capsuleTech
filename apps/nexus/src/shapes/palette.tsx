/**
 * Palette — batch-shape палитры видов нод (ADR 027). Данные/схема — из
 * `Entities.NodeKind`; рендерится в `ui.List` (batch), каждый айтем —
 * `Views.PaletteItem` (draggable). `itemProps` — чистый маппинг данных
 * (drag-логика живёт в самом айтеме). Mount-сайт — `Widgets.Palette`.
 */
const Palette = Shape((_z, ui) => ({
  schema: Entities.NodeKind.schema,
  defaults: Entities.NodeKind.defaults,
  as: ui.List,
  itemAs: Views.PaletteItem,
  itemProps: (item: { type: string; label: string; icon: unknown }) => ({
    type: item.type,
    label: item.label,
    icon: item.icon,
  }),
  orientation: 'vertical',
}));

export default Palette;
