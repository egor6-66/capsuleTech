import type { IGaugeView } from '../features/systemMonitor';

/**
 * GaugeCard — one radial gauge (itemAs for `Shapes.MonitorGauges`). Stateless
 * projection: reads its live value from the store by `metricKey`; hides itself
 * when that metric is absent (e.g. GPU on a machine without one). Container-scaled
 * & capped so it never balloons in a stretched grid cell.
 */
const GaugeCard = View((Ui, props: { metricKey: string; label: string }) => {
  const ctx = useCtx();
  const g = (): IGaugeView | null =>
    (ctx.store.ctx.data?.gauges?.[props.metricKey] as IGaugeView | null) ?? null;
  return (
    <Ui.Flow.Show when={g()}>
      {(gv) => (
        <Ui.Card class="mx-auto flex aspect-square w-[clamp(68px,26cqw,120px)] items-center justify-center p-1">
          <Ui.Chart.Gauge
            value={gv().value}
            label={props.label}
            color={gv().color}
            animate={false}
            class="h-full w-full"
          />
        </Ui.Card>
      )}
    </Ui.Flow.Show>
  );
});

export default GaugeCard;
