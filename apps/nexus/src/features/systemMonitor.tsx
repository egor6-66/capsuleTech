import { type ILatest, type ISample, subscribeMetrics } from './metricsSource';

/**
 * SystemMonitor — host-metrics Feature for the dashboard 'monitor' node (ADR 023 + 028).
 *
 * Thin: the actual collection lives in the SHARED `metricsSource` singleton (one
 * machine → one source), so every monitor node shows IDENTICAL data. onInit
 * subscribes and mirrors the shared snapshot into this node's store; onDispose
 * unsubscribes (ref-counted — the source stops with the last node).
 *
 * Per-node UI state: the selected time range. Range pills carry
 * `meta.tags = ['range', <id>]`; onClick records it in `store.ctx.data.range`.
 * The View windows the shared `samples` by the local `range`.
 *
 * State contract (read via `store.ctx.data.X` in the View):
 *   range:'1m'|'5m'|'15m'|'1h' · samples:ISample[] · latest:ILatest|null
 *   available:boolean (true = real desktop data, false = mock)
 */

export type { ILatest, ISample } from './metricsSource';

export type TimeRange = '1m' | '5m' | '15m' | '1h';
const RANGES: readonly TimeRange[] = ['1m', '5m', '15m', '1h'];
export const RANGE_MS: Record<TimeRange, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
};

const SystemMonitor = Feature(() => {
  let unsubscribe: (() => void) | null = null;

  return {
    initial: 'live',
    context: {
      range: '1m' as TimeRange,
      samples: [] as ISample[],
      latest: null as ILatest | null,
      available: false,
    },
    states: {
      live: {
        onInit: ({ store }) => {
          // Mirror the shared collector into this node's reactive store.
          unsubscribe = subscribeMetrics((snap) => {
            store.update({
              samples: snap.samples,
              latest: snap.latest,
              available: snap.available,
            });
          });
        },
        onClick: ({ target, store, next }) => {
          const tags = (target.meta?.tags ?? []) as readonly string[];
          if (!tags.includes('range')) return next();
          const r = tags.find((t) => (RANGES as readonly string[]).includes(t)) as
            | TimeRange
            | undefined;
          if (r) store.update({ range: r });
        },
      },
    },
    onDispose: () => {
      unsubscribe?.();
      unsubscribe = null;
    },
  };
});

export default SystemMonitor;
