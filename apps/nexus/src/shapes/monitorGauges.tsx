/**
 * MonitorGauges — batch-shape of the radial gauges (ADR 028). Catalog/schema from
 * `Entities.GaugeKinds`; rendered via `ui.List` in responsive grid mode (`min`)
 * so gauges auto-fit + wrap by width. Each item → `Views.GaugeCard`, which reads
 * its live value from the `Features.SystemMonitor` store by key.
 */
const MonitorGauges = Shape((_z, ui) => ({
  schema: Entities.GaugeKinds.schema,
  defaults: Entities.GaugeKinds.defaults,
  as: ui.List,
  itemAs: Views.GaugeCard,
  itemProps: (item: { key: string; label: string }) => ({
    metricKey: item.key,
    label: item.label,
  }),
  min: '84px',
  gap: '0.5rem',
}));

export default MonitorGauges;
