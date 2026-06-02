/**
 * MonitorStats — batch-shape of the stat cards (ADR 028). Catalog/schema from
 * `Entities.StatKinds`; rendered via `ui.List` in responsive grid mode (`min`)
 * so cards fill + wrap 1..4 columns by width. Each item → `Views.StatCard`,
 * which reads its live `{ value, sub }` from the `Features.SystemMonitor` store.
 */
const MonitorStats = Shape((_z, ui) => ({
  schema: Entities.StatKinds.schema,
  defaults: Entities.StatKinds.defaults,
  as: ui.List,
  itemAs: Views.StatCard,
  itemProps: (item: { key: string; label: string }) => ({
    metricKey: item.key,
    label: item.label,
  }),
  min: '116px',
  gap: '0.5rem',
}));

export default MonitorStats;
