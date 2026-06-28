import { type Component, onCleanup, onMount } from 'solid-js';
import { useProfiler } from '../api/useProfiler';
import { useTraceBus } from '../api/useTraceBus';
import type { IMetricsListener, IReporter } from '../core/schema';
import type { ITraceListener } from '../core/trace';
import { beaconReporter, type IBeaconReporterOpts } from './beacon';
import { callbackReporter } from './callback';
import { consoleReporter, type IConsoleReporterOpts } from './console';
import {
  type ITraceBeaconReporterOpts,
  type ITraceConsoleReporterOpts,
  type ITraceReporter,
  traceBeaconReporter,
  traceCallbackReporter,
  traceConsoleReporter,
} from './trace';

/**
 * Оборачивает `IReporter`-фабрику в само-регистрирующийся компонент-читатель
 * (ADR 063 D2). На маунте подписывается на `MetricsBus` из `ProfilerContext`,
 * на unmount — отписка. Потребитель монтит нужный ему интерфейс мониторинга.
 */
function reporterComponent<P extends object = Record<never, never>>(
  factory: (opts: P) => IReporter,
): Component<P> {
  return (props) => {
    const bus = useProfiler();
    onMount(() => onCleanup(factory(props as P).init(bus)));
    return null;
  };
}

/** То же для trace-reporters — подписка на `TraceBus` из `TraceContext`. */
function traceReporterComponent<P extends object = Record<never, never>>(
  factory: (opts: P) => ITraceReporter,
): Component<P> {
  return (props) => {
    const bus = useTraceBus();
    onMount(() => {
      if (!bus) return;
      onCleanup(factory(props as P).init(bus));
    });
    return null;
  };
}

// ── Metric-reporters ──
export const ConsoleReporter = reporterComponent((o: IConsoleReporterOpts) => consoleReporter(o));
export const BeaconReporter = reporterComponent((o: IBeaconReporterOpts) => beaconReporter(o));
export const CallbackReporter = reporterComponent((o: { on: IMetricsListener }) =>
  callbackReporter(o.on),
);

// ── Trace-reporters ──
export const TraceConsoleReporter = traceReporterComponent((o: ITraceConsoleReporterOpts) =>
  traceConsoleReporter(o),
);
export const TraceBeaconReporter = traceReporterComponent((o: ITraceBeaconReporterOpts) =>
  traceBeaconReporter(o),
);
export const TraceCallbackReporter = traceReporterComponent((o: { on: ITraceListener }) =>
  traceCallbackReporter(o.on),
);
