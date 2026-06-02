import type { IStatView } from '../features/systemMonitor';

/**
 * StatCard — one labelled stat (itemAs for `Shapes.MonitorStats`). Stateless
 * projection: reads its live `{ value, sub }` from the store by `metricKey`;
 * hides itself when the metric is absent. Fills its grid cell.
 */
const StatCard = View((Ui, props: { metricKey: string; label: string }) => {
  const ctx = useCtx();
  const s = (): IStatView | null =>
    (ctx.store.ctx.data?.stats?.[props.metricKey] as IStatView | null) ?? null;
  return (
    <Ui.Flow.Show when={s()}>
      {(sv) => (
        <Ui.Card class="flex w-full flex-col gap-0.5 p-cell">
          <Ui.Typography variant="muted" class="text-xs">
            {props.label}
          </Ui.Typography>
          <span class="truncate text-sm font-semibold tabular-nums" title={sv().value}>
            {sv().value}
          </span>
          <Ui.Typography variant="muted" class="text-[11px] tabular-nums">
            {sv().sub}
          </Ui.Typography>
        </Ui.Card>
      )}
    </Ui.Flow.Show>
  );
});

export default StatCard;
