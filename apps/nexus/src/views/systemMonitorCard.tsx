import type { Component } from 'solid-js';
import type { ISystemMonitorData, TimeRange } from '../features/systemMonitor';

/**
 * SystemMonitorCard — host-monitor projection (ADR 028). Pure rendering: reads
 * already-derived data from the `Features.SystemMonitor` store and lays it out
 * with `Ui.Layout.Flex` / `Ui.Layout.Grid`. The repeated blocks are data-driven
 * Shapes (`Shapes.MonitorGauges` / `Shapes.MonitorStats`); the two trend
 * sparklines + per-core bars read ready series/cores from the store. No logic here.
 */

const RANGES: readonly TimeRange[] = ['1m', '5m', '15m', '1h'];
const RANGE_LABEL: Record<TimeRange, string> = { '1m': '1м', '5m': '5м', '15m': '15м', '1h': '1ч' };

const SystemMonitorCard = View((Ui, props: { icon?: Component<{ class?: string }> }) => {
  const ctx = useCtx();
  const d = (): ISystemMonitorData | undefined =>
    ctx.store.ctx.data as ISystemMonitorData | undefined;

  return (
    <div class="@container flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground">
      {/* Header: title + status + range pills */}
      <Ui.Layout.Flex
        wrap="wrap"
        align="center"
        justify="between"
        gap={2}
        class="shrink-0 gap-y-1 px-cell pt-cell"
      >
        <Ui.Layout.Flex align="center" gap={1.5} class="min-w-0">
          <Ui.Flow.Dynamic component={props.icon} class="size-4 shrink-0 text-muted-foreground" />
          <Ui.Typography variant="h4" class="truncate">
            Мониторинг
          </Ui.Typography>
          <span
            class="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]"
            classList={{
              'bg-emerald-500/15 text-emerald-500': !!d()?.available,
              'bg-amber-500/15 text-amber-500': !d()?.available,
            }}
          >
            <span
              class="size-1.5 rounded-full"
              classList={{
                'bg-emerald-500': !!d()?.available,
                'bg-amber-500': !d()?.available,
              }}
            />
            {d()?.available ? 'live' : 'demo'}
          </span>
        </Ui.Layout.Flex>
        <Ui.Layout.Flex align="center" gap={0.5} class="shrink-0 rounded-md bg-muted p-0.5">
          <Ui.Flow.For each={RANGES}>
            {(r) => (
              <Ui.Button
                meta={{ tags: ['range', r] }}
                size="sm"
                variant={d()?.range === r ? 'secondary' : 'ghost'}
                class="px-2 py-0.5"
              >
                {RANGE_LABEL[r]}
              </Ui.Button>
            )}
          </Ui.Flow.For>
        </Ui.Layout.Flex>
      </Ui.Layout.Flex>

      {/* Panels — sections fill width (auto-fit) and grow to fill height; nothing hidden */}
      <Ui.Layout.Flex direction="col" gap={2} class="min-h-0 flex-1 overflow-auto p-cell">
        {/* Gauges (data-driven Shape, responsive grid) */}
        <Shapes.MonitorGauges />

        {/* History sparklines */}
        <Ui.Layout.Grid
          cols="repeat(auto-fit, minmax(165px, 1fr))"
          autoRows="minmax(0, 1fr)"
          gap={2}
          class="min-h-[5.5rem] flex-1"
        >
          <Ui.Card class="flex min-h-0 flex-col gap-1 p-cell">
            <Ui.Layout.Flex align="center" justify="between">
              <Ui.Typography variant="muted" class="text-xs">
                CPU
              </Ui.Typography>
              <span class="text-xs font-semibold tabular-nums">{d()?.gauges?.cpu?.value ?? 0}%</span>
            </Ui.Layout.Flex>
            <Ui.Chart.Area
              labels={d()?.series?.labels ?? []}
              series={[{ label: 'CPU', data: d()?.series?.cpu ?? [] }]}
              sparkline
              min={0}
              max={100}
              animate={false}
              class="min-h-0 w-full flex-1"
            />
          </Ui.Card>
          <Ui.Card class="flex min-h-0 flex-col gap-1 p-cell">
            <Ui.Layout.Flex align="center" justify="between">
              <Ui.Typography variant="muted" class="text-xs">
                RAM
              </Ui.Typography>
              <span class="text-xs font-semibold tabular-nums">{d()?.gauges?.mem?.value ?? 0}%</span>
            </Ui.Layout.Flex>
            <Ui.Chart.Area
              labels={d()?.series?.labels ?? []}
              series={[{ label: 'RAM', data: d()?.series?.mem ?? [] }]}
              sparkline
              min={0}
              max={100}
              animate={false}
              class="min-h-0 w-full flex-1"
            />
          </Ui.Card>
        </Ui.Layout.Grid>

        {/* Per-core CPU bars */}
        <Ui.Card class="flex min-h-[4.5rem] flex-1 flex-col gap-1 p-cell">
          <Ui.Typography variant="muted" class="text-xs">
            Ядра CPU
          </Ui.Typography>
          <Ui.Chart.Bar
            labels={(d()?.cores ?? []).map((_, i) => i + 1)}
            series={[{ label: '%', data: d()?.cores ?? [] }]}
            min={0}
            max={100}
            animate={false}
            class="min-h-0 w-full flex-1"
          />
        </Ui.Card>

        {/* Stat cards (data-driven Shape, responsive grid) */}
        <Shapes.MonitorStats />
      </Ui.Layout.Flex>
    </div>
  );
});

export default SystemMonitorCard;
