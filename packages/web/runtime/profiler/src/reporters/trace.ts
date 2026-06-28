import { isBrowser } from '../core/env';
import type { ITraceBus, ITraceEvent, ITraceListener } from '../core/trace';

/**
 * Trace-reporters — тонкий аналог metric-reporters, но поверх `ITraceBus`
 * (события `ITraceEvent`, не `(id, sample, meta)`). Сток: console=dev,
 * beacon=prod-ship на бэкенд, callback=generic (ADR 062 D5).
 */
export interface ITraceReporter {
  readonly name: string;
  init(bus: ITraceBus): () => void;
}

export interface ITraceConsoleReporterOpts {
  prefix?: string;
  /** Фильтр по событию (например по `node`). */
  filter?: (event: ITraceEvent) => boolean;
}

export function traceConsoleReporter(opts: ITraceConsoleReporterOpts = {}): ITraceReporter {
  const prefix = opts.prefix ?? '[trace]';
  const filter = opts.filter;

  return {
    name: 'trace-console',
    init(bus) {
      return bus.subscribe((e) => {
        if (filter && !filter(e)) return;
        const head = `${prefix} ${e.traceId} ${e.node}:${e.phase}`;
        if (e.data !== undefined) console.log(head, e.data);
        else console.log(head);
      });
    },
  };
}

export function traceCallbackReporter(fn: ITraceListener): ITraceReporter {
  return {
    name: 'trace-callback',
    init(bus) {
      return bus.subscribe(fn);
    },
  };
}

export interface ITraceBeaconReporterOpts {
  url: string;
  on?: Array<'hidden' | 'pagehide'>;
  serializer?: (events: readonly ITraceEvent[]) => BodyInit;
}

const noop = () => undefined;

/**
 * Шлёт накопленный trace-поток на бэкенд через `sendBeacon` на
 * visibilitychange/pagehide — диагностика «работает локально, ломается удалённо».
 */
export function traceBeaconReporter(opts: ITraceBeaconReporterOpts): ITraceReporter {
  const triggers = opts.on ?? ['hidden', 'pagehide'];
  const serializer = opts.serializer ?? ((events) => JSON.stringify(events));

  return {
    name: 'trace-beacon',
    init(bus) {
      if (!isBrowser || typeof navigator.sendBeacon !== 'function') return noop;

      const send = () => {
        try {
          const events = bus.all();
          if (events.length === 0) return;
          navigator.sendBeacon(opts.url, serializer(events));
        } catch {
          /* swallow — beacon is best-effort */
        }
      };

      const onVisibility = () => {
        if (document.visibilityState === 'hidden') send();
      };
      const onPageHide = () => send();

      if (triggers.includes('hidden')) document.addEventListener('visibilitychange', onVisibility);
      if (triggers.includes('pagehide')) window.addEventListener('pagehide', onPageHide);

      return () => {
        if (triggers.includes('hidden'))
          document.removeEventListener('visibilitychange', onVisibility);
        if (triggers.includes('pagehide')) window.removeEventListener('pagehide', onPageHide);
      };
    },
  };
}
