import { type JSX, onCleanup, onMount, Show } from 'solid-js';
import { ProfilerContext } from '../api/useProfiler';
import { TraceContext } from '../api/useTraceBus';
import {
  connectionCollector,
  domStatsCollector,
  errorsCollector,
  eventTimingCollector,
  fpsCollector,
  loafCollector,
  longTasksCollector,
  memoryCollector,
  navigationCollector,
  networkCollector,
  networkDeepCollector,
  userTimingCollector,
  webVitalsCollector,
} from '../collectors';
import { createMetricsBus } from '../core/bus';
import type { ICollector, IMetricsBus, IReporter } from '../core/schema';
import { createTraceBus, type ITraceBus } from '../core/trace';
import type { ITraceReporter } from '../reporters/trace';
import { configureTrace, type ITraceConfig, registerTraceSink } from '../trace';
import { ProfilerDashboard } from '../widget';

export type IProfilerCollectorsOpt = 'all' | 'all-except-deep' | 'legacy' | ICollector[];

/** Конфиг trace-канала (ADR 062). Тогл также управляем рантаймом через `trace.*`. */
export interface IProfilerTraceConfig extends ITraceConfig {
  /** Размер кольца trace-событий. По умолчанию 500. */
  capacity?: number;
  /** Trace-reporters (console/beacon/callback). */
  reporters?: ITraceReporter[];
}

export interface IProfilerProviderProps {
  children: JSX.Element;
  collectors?: IProfilerCollectorsOpt;
  reporters?: IReporter[];
  bus?: IMetricsBus;
  historySize?: number;
  showDashboard?: boolean;
  /** Trace-канал жизненного цикла. Отсутствие = канал создаётся, но тогл off. */
  trace?: IProfilerTraceConfig;
  /** Готовый trace-bus (для тестов / переиспользования). */
  traceBus?: ITraceBus;
}

function legacyCollectors(): ICollector[] {
  return [
    webVitalsCollector(),
    memoryCollector(),
    networkCollector(),
    navigationCollector(),
    connectionCollector(),
  ];
}

function allCollectors(includeDeep: boolean): ICollector[] {
  const base: ICollector[] = [
    ...legacyCollectors(),
    longTasksCollector(),
    loafCollector(),
    eventTimingCollector(),
    fpsCollector(),
    domStatsCollector(),
    errorsCollector(),
    userTimingCollector(),
  ];
  if (includeDeep) base.push(networkDeepCollector());
  return base;
}

function resolveCollectors(opt: IProfilerCollectorsOpt): ICollector[] {
  if (Array.isArray(opt)) return opt;
  if (opt === 'legacy') return legacyCollectors();
  return allCollectors(opt === 'all');
}

export function ProfilerProvider(props: IProfilerProviderProps) {
  const bus = props.bus ?? createMetricsBus({ historySize: props.historySize });
  // Trace-bus создаётся всегда (дешёвый ring) — чтобы рантайм-тогл `trace.enable()`
  // и панель Traces работали даже без явного `trace`-конфига. Тогл off по умолчанию
  // → ноль событий, пока не включат.
  const traceBus = props.traceBus ?? createTraceBus({ capacity: props.trace?.capacity });

  onMount(() => {
    const collectorOpt = props.collectors ?? 'all-except-deep';
    const collectors = resolveCollectors(collectorOpt);
    const reporters = props.reporters ?? [];

    const cleanups: Array<() => void> = [];
    for (const c of collectors) cleanups.push(c.init(bus));
    for (const r of reporters) cleanups.push(r.init(bus));

    // Trace-канал: регистрируем sink (module-level `trace()` потечёт в bus),
    // применяем app-конфиг тогла, поднимаем trace-reporters.
    cleanups.push(registerTraceSink({ emit: (e) => traceBus.push(e) }));
    if (props.trace) {
      const { capacity: _c, reporters: traceReporters, ...toggle } = props.trace;
      configureTrace(toggle);
      for (const r of traceReporters ?? []) cleanups.push(r.init(traceBus));
    }

    onCleanup(() => {
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          /* swallow — collector cleanup must not break the tree */
        }
      }
    });
  });

  return (
    <ProfilerContext.Provider value={bus}>
      <TraceContext.Provider value={traceBus}>
        {props.children}
        <Show when={props.showDashboard}>
          <ProfilerDashboard />
        </Show>
      </TraceContext.Provider>
    </ProfilerContext.Provider>
  );
}
