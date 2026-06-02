import type { Component } from 'solid-js';
import { createMemo } from 'solid-js';
import type { ILatest, ISample, TimeRange } from '../features/systemMonitor';

/**
 * SystemMonitorCard — наглядный host-monitor (ADR 028). Stateless-проекция
 * стора `Features.SystemMonitor`: гейджи (CPU/RAM/GPU), area-спарклайны истории,
 * бар по ядрам, stat-карточки, пилюли тайминга. Графики — `Ui.Chart.*`.
 *
 * Реактив: читает `ctx.store.ctx.data` (range/samples/latest/available); пилюли
 * несут `meta.tags=['range', <id>]` → `Features.SystemMonitor.onClick` пишет range.
 * @container-адаптив: на узком узле показываем самое важное, на широком — всё.
 */

interface IState {
  range: TimeRange;
  samples: ISample[];
  latest: ILatest | null;
  available: boolean;
  error: string | null;
}

const RANGES: readonly TimeRange[] = ['1m', '5m', '15m', '1h'];
const RANGE_LABEL: Record<TimeRange, string> = {
  '1m': '1м',
  '5m': '5м',
  '15m': '15м',
  '1h': '1ч',
};
const WINDOW_MS: Record<TimeRange, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
};
/**
 * Fixed render width (points) per range. The series is ALWAYS this length
 * (left-padded with nulls while history fills) so Chart.js keeps element
 * identity across ticks and *morphs* values in place instead of re-animating
 * the line from the origin on every update.
 */
const POINTS: Record<TimeRange, number> = {
  '1m': 12,
  '5m': 30,
  '15m': 45,
  '1h': 60,
};

const round1 = (v: number): number => Math.round(v * 10) / 10;
const fmtGB = (bytes: number | null | undefined): string =>
  bytes == null ? '—' : `${(bytes / 1024 ** 3).toFixed(1)} ГБ`;
const fmtNet = (bytesPerS: number | null | undefined): string => {
  if (bytesPerS == null) return '—';
  if (bytesPerS >= 1024 * 1024) return `${(bytesPerS / 1024 / 1024).toFixed(1)} МБ/с`;
  return `${Math.round(bytesPerS / 1024)} КБ/с`;
};
const fmtTime = (t: number): string =>
  new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
/** Load → semantic traffic-light color (green / amber / red). */
const loadColor = (v: number): string => (v >= 85 ? '#ef4444' : v >= 60 ? '#f59e0b' : '#22c55e');

/** Resample to EXACTLY `n` evenly-spaced points (incl. first & last) when the
 *  input is longer; otherwise return as-is. Constant length is what keeps the
 *  chart morphing smoothly instead of re-entering. */
const downsample = <T,>(arr: T[], n: number): T[] => {
  if (arr.length <= n) return arr;
  const out: T[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)] as T);
  return out;
};

const SystemMonitorCard = View((Ui, props: { icon?: Component<{ class?: string }> }) => {
  const ctx = useCtx();
  const d = (): IState | undefined => ctx.store.ctx.data as IState | undefined;
  const lat = (): ILatest | null => d()?.latest ?? null;

  /**
   * Constant-length windowed series for the selected range. Always `POINTS[range]`
   * long — left-padded with nulls while history is still filling — so each tick
   * morphs values in place (no re-animation from the origin).
   */
  const win = createMemo(() => {
    const range = d()?.range ?? '1m';
    const n = POINTS[range];
    const samples = d()?.samples ?? [];
    const now = samples.length ? (samples[samples.length - 1]?.t ?? Date.now()) : Date.now();
    const pts = downsample(
      samples.filter((s) => s.t >= now - WINDOW_MS[range]),
      n,
    );
    const pad = Math.max(0, n - pts.length);
    const padNum = (vals: (number | null)[]): (number | null)[] => [
      ...(Array(pad).fill(null) as null[]),
      ...vals,
    ];
    return {
      labels: [...(Array(pad).fill('') as string[]), ...pts.map((p) => fmtTime(p.t))],
      cpu: padNum(pts.map((p) => round1(p.cpu))),
      mem: padNum(pts.map((p) => round1(p.mem))),
      gpu: padNum(pts.map((p) => (p.gpu == null ? null : round1(p.gpu)))),
    };
  });

  const coreLabels = (): number[] => (lat()?.perCore ?? []).map((_, i) => i + 1);

  return (
    <div class="@container flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground">
      {/* Header: title + status + range pills */}
      <div class="flex shrink-0 items-center justify-between gap-2 px-cell pt-cell">
        <div class="flex min-w-0 items-center gap-1.5">
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
        </div>
        <div class="hidden shrink-0 items-center gap-0.5 rounded-md bg-muted p-0.5 @min-[260px]:flex">
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
        </div>
      </div>

      {/* Panels grid — reflows by container width, optional panels reveal as it grows */}
      <div class="grid flex-1 content-start gap-2 overflow-auto grid-cols-[repeat(auto-fill,minmax(108px,1fr))] auto-rows-min p-cell">
        {/* Gauges */}
        <Ui.Card class="flex aspect-square items-center justify-center p-1">
          <Ui.Chart.Gauge value={lat()?.cpu ?? 0} label="CPU" color={loadColor(lat()?.cpu ?? 0)} animate={false} class="h-full w-full" />
        </Ui.Card>
        <Ui.Card class="flex aspect-square items-center justify-center p-1">
          <Ui.Chart.Gauge value={lat()?.mem ?? 0} label="RAM" color={loadColor(lat()?.mem ?? 0)} animate={false} class="h-full w-full" />
        </Ui.Card>
        <Ui.Flow.Show when={lat()?.gpu != null}>
          <Ui.Card class="hidden aspect-square items-center justify-center p-1 @min-[340px]:flex">
            <Ui.Chart.Gauge value={lat()?.gpu ?? 0} label="GPU" color={loadColor(lat()?.gpu ?? 0)} animate={false} class="h-full w-full" />
          </Ui.Card>
        </Ui.Flow.Show>

        {/* CPU history sparkline */}
        <Ui.Card class="col-span-2 flex flex-col gap-1 p-cell">
          <div class="flex items-center justify-between">
            <Ui.Typography variant="muted" class="text-xs">
              CPU
            </Ui.Typography>
            <span class="text-xs font-semibold tabular-nums">{round1(lat()?.cpu ?? 0)}%</span>
          </div>
          <Ui.Chart.Area labels={win().labels} series={[{ label: 'CPU', data: win().cpu }]} sparkline min={0} max={100} animate={false} class="h-12 w-full" />
        </Ui.Card>

        {/* RAM history sparkline */}
        <Ui.Card class="col-span-2 hidden flex-col gap-1 p-cell @min-[300px]:flex">
          <div class="flex items-center justify-between">
            <Ui.Typography variant="muted" class="text-xs">
              RAM
            </Ui.Typography>
            <span class="text-xs font-semibold tabular-nums">{round1(lat()?.mem ?? 0)}%</span>
          </div>
          <Ui.Chart.Area labels={win().labels} series={[{ label: 'RAM', data: win().mem }]} sparkline min={0} max={100} animate={false} class="h-12 w-full" />
        </Ui.Card>

        {/* Per-core CPU bars */}
        <Ui.Card class="col-span-full hidden flex-col gap-1 p-cell @min-[420px]:flex">
          <Ui.Typography variant="muted" class="text-xs">
            Ядра CPU
          </Ui.Typography>
          <Ui.Chart.Bar
            labels={coreLabels()}
            series={[{ label: '%', data: lat()?.perCore ?? [] }]}
            min={0}
            max={100}
            animate={false}
            class="h-20 w-full"
          />
        </Ui.Card>

        {/* Stat cards */}
        <Ui.Card class="col-span-2 hidden flex-col gap-0.5 p-cell @min-[420px]:flex">
          <Ui.Typography variant="muted" class="text-xs">
            RAM
          </Ui.Typography>
          <span class="text-sm font-semibold tabular-nums">
            {fmtGB(lat()?.memUsed)} / {fmtGB(lat()?.memTotal)}
          </span>
          <Ui.Typography variant="muted" class="text-[11px]">
            swap {round1(lat()?.swapPct ?? 0)}%
          </Ui.Typography>
        </Ui.Card>
        <Ui.Card class="col-span-2 hidden flex-col gap-0.5 p-cell @min-[420px]:flex">
          <Ui.Typography variant="muted" class="text-xs">
            CPU
          </Ui.Typography>
          <span class="truncate text-sm font-semibold" title={lat()?.cpuBrand}>
            {lat()?.cpuBrand ?? '—'}
          </span>
          <Ui.Typography variant="muted" class="text-[11px]">
            {lat()?.cpuCores ?? 0} потоков
            <Ui.Flow.Show when={lat()?.cpuFreqMhz}>
              {' · '}
              {((lat()?.cpuFreqMhz ?? 0) / 1000).toFixed(1)} ГГц
            </Ui.Flow.Show>
          </Ui.Typography>
        </Ui.Card>
        <Ui.Flow.Show when={lat()?.gpuName}>
          <Ui.Card class="col-span-2 hidden flex-col gap-0.5 p-cell @min-[420px]:flex">
            <Ui.Typography variant="muted" class="text-xs">
              GPU
            </Ui.Typography>
            <span class="truncate text-sm font-semibold" title={lat()?.gpuName ?? ''}>
              {lat()?.gpuName}
            </span>
            <Ui.Typography variant="muted" class="text-[11px]">
              {fmtGB(lat()?.vramUsed)} / {fmtGB(lat()?.vramTotal)} VRAM
            </Ui.Typography>
          </Ui.Card>
        </Ui.Flow.Show>
        <Ui.Card class="col-span-2 hidden flex-col gap-0.5 p-cell @min-[420px]:flex">
          <Ui.Typography variant="muted" class="text-xs">
            Сеть
          </Ui.Typography>
          <span class="text-sm font-semibold tabular-nums">↓ {fmtNet(lat()?.netRx)}</span>
          <Ui.Typography variant="muted" class="text-[11px] tabular-nums">
            ↑ {fmtNet(lat()?.netTx)}
          </Ui.Typography>
        </Ui.Card>
      </div>
    </div>
  );
});

export default SystemMonitorCard;
