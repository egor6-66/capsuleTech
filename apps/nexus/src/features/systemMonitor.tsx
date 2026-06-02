import { type ILatest, type ISample, subscribeMetrics } from './metricsSource';

/**
 * SystemMonitor — host-metrics Feature for the dashboard 'monitor' node (ADR 023 + 028).
 *
 * Thin orchestration + ALL the logic. Subscribes to the SHARED `metricsSource`
 * singleton (one machine → identical data on every monitor node), then DERIVES
 * render-ready data here (formatting, traffic-light colors, rolling window) and
 * puts it in the store. The Views read those ready values by key and do no logic.
 *
 * Store contract (read via `store.ctx.data.X`):
 *   range · available · gauges{cpu,mem,gpu} · stats{ram,cpu,gpu,net} · series · cores
 */

export type TimeRange = '1m' | '5m' | '15m' | '1h';
const RANGES: readonly TimeRange[] = ['1m', '5m', '15m', '1h'];
export const RANGE_MS: Record<TimeRange, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
};
/** Fixed render width per range — constant length keeps charts morphing, not re-entering. */
const POINTS: Record<TimeRange, number> = { '1m': 12, '5m': 30, '15m': 45, '1h': 60 };

/** Render-ready gauge value (one ring). */
export interface IGaugeView {
  value: number;
  color: string;
}
/** Render-ready stat card (label lives in the catalog Entity). */
export interface IStatView {
  value: string;
  sub: string;
}
/** Full render-ready store shape consumed by the Views. */
export interface ISystemMonitorData {
  range: TimeRange;
  available: boolean;
  gauges: Record<string, IGaugeView | null>;
  stats: Record<string, IStatView | null>;
  series: { labels: string[]; cpu: (number | null)[]; mem: (number | null)[] };
  cores: number[];
}

// --- pure derive / format helpers (the "logic", kept out of the View) ----------
const round1 = (v: number): number => Math.round(v * 10) / 10;
const fmtGB = (b: number | null | undefined): string =>
  b == null ? '—' : `${(b / 1024 ** 3).toFixed(1)} ГБ`;
const fmtNet = (b: number | null | undefined): string => {
  if (b == null) return '—';
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} МБ/с`;
  return `${Math.round(b / 1024)} КБ/с`;
};
const fmtTime = (t: number): string =>
  new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
/** Load → semantic traffic-light color (green / amber / red). */
const loadColor = (v: number): string => (v >= 85 ? '#ef4444' : v >= 60 ? '#f59e0b' : '#22c55e');

/** Resample to exactly `n` evenly-spaced points when longer; constant length morphs smoothly. */
const downsample = <T,>(arr: T[], n: number): T[] => {
  if (arr.length <= n) return arr;
  const out: T[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)] as T);
  return out;
};

const deriveGauges = (l: ILatest | null): ISystemMonitorData['gauges'] =>
  l == null
    ? { cpu: null, mem: null, gpu: null }
    : {
        cpu: { value: round1(l.cpu), color: loadColor(l.cpu) },
        mem: { value: round1(l.mem), color: loadColor(l.mem) },
        gpu: l.gpu == null ? null : { value: round1(l.gpu), color: loadColor(l.gpu) },
      };

const deriveStats = (l: ILatest | null): ISystemMonitorData['stats'] =>
  l == null
    ? { ram: null, cpu: null, gpu: null, net: null }
    : {
        ram: {
          value: `${fmtGB(l.memUsed)} / ${fmtGB(l.memTotal)}`,
          sub: `swap ${round1(l.swapPct)}%`,
        },
        cpu: {
          value: l.cpuBrand,
          sub: `${l.cpuCores} потоков${l.cpuFreqMhz ? ` · ${(l.cpuFreqMhz / 1000).toFixed(1)} ГГц` : ''}`,
        },
        gpu:
          l.gpuName == null
            ? null
            : { value: l.gpuName, sub: `${fmtGB(l.vramUsed)} / ${fmtGB(l.vramTotal)} VRAM` },
        net: { value: `↓ ${fmtNet(l.netRx)}`, sub: `↑ ${fmtNet(l.netTx)}` },
      };

const deriveSeries = (samples: ISample[], range: TimeRange): ISystemMonitorData['series'] => {
  const n = POINTS[range];
  const now = samples.length ? (samples[samples.length - 1]?.t ?? Date.now()) : Date.now();
  const pts = downsample(
    samples.filter((s) => s.t >= now - RANGE_MS[range]),
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
  };
};

const SystemMonitor = Feature(() => {
  let unsubscribe: (() => void) | null = null;
  let bridge: { update: (p: Record<string, unknown>) => void } | null = null;
  let latest: ILatest | null = null;
  let samples: ISample[] = [];
  let available = false;
  let range: TimeRange = '1m';

  const recompute = (): void => {
    bridge?.update({
      available,
      gauges: deriveGauges(latest),
      stats: deriveStats(latest),
      series: deriveSeries(samples, range),
      cores: latest?.perCore ?? [],
    });
  };

  return {
    initial: 'live',
    context: {
      range,
      available: false,
      gauges: { cpu: null, mem: null, gpu: null },
      stats: { ram: null, cpu: null, gpu: null, net: null },
      series: { labels: [], cpu: [], mem: [] },
      cores: [],
    } as ISystemMonitorData,
    states: {
      live: {
        onInit: ({ store }) => {
          bridge = store;
          unsubscribe = subscribeMetrics((snap) => {
            latest = snap.latest;
            samples = snap.samples;
            available = snap.available;
            recompute();
          });
        },
        onClick: ({ target, store, next }) => {
          const tags = (target.meta?.tags ?? []) as readonly string[];
          if (!tags.includes('range')) return next();
          const r = tags.find((t) => (RANGES as readonly string[]).includes(t)) as
            | TimeRange
            | undefined;
          if (r) {
            range = r;
            store.update({ range: r });
            recompute();
          }
        },
      },
    },
    onDispose: () => {
      unsubscribe?.();
      unsubscribe = null;
      bridge = null;
    },
  };
});

export default SystemMonitor;
