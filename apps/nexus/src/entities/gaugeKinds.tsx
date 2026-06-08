/**
 * GaugeKinds — catalog of the radial gauges shown on the monitor node (ADR 028).
 * Static spec only (`key` → store-gauge key, `label`). Live values come from
 * `Features.SystemMonitor` store; `Shapes.MonitorGauges` batches this catalog.
 */
const GaugeKinds = Entity(({ zod }) => ({
  schema: zod.array(zod.object({ key: zod.string(), label: zod.string() })),
  defaults: [
    { key: 'cpu', label: 'CPU' },
    { key: 'mem', label: 'RAM' },
    { key: 'gpu', label: 'GPU' },
  ],
}));

export default GaugeKinds;
