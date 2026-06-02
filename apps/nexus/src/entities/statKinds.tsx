/**
 * StatKinds — catalog of the stat cards shown on the monitor node (ADR 028).
 * Static spec only (`key` → store-stat key, `label`). Live values come from
 * `Features.SystemMonitor` store; `Shapes.MonitorStats` batches this catalog.
 */
const StatKinds = Entity((z) => ({
  schema: z.array(z.object({ key: z.string(), label: z.string() })),
  defaults: [
    { key: 'ram', label: 'RAM' },
    { key: 'cpu', label: 'CPU' },
    { key: 'gpu', label: 'GPU' },
    { key: 'net', label: 'Сеть' },
  ],
}));

export default StatKinds;
