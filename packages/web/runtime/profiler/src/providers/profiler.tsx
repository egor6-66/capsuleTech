import { type JSX, onCleanup, onMount } from 'solid-js';
import { ProfilerContext } from '../api/useProfiler';
import { TraceContext } from '../api/useTraceBus';
import { createMetricsBus } from '../core/bus';
import type { IMetricsBus } from '../core/schema';
import { createTraceBus, type ITraceBus } from '../core/trace';
import { configureTrace, type ITraceConfig, registerTraceSink } from '../trace';

/**
 * Конфиг trace-канала (ADR 062). Это **prop-конфиг** (настройка того, что уже
 * есть в провайдере: шина + тогл), НЕ сабмодуль. Reporters/Dashboard/коллекторы —
 * отдельные сабмодули-children (ADR 063 D2), здесь их нет.
 */
export interface IProfilerTraceConfig extends ITraceConfig {
  /** Размер кольца trace-событий. По умолчанию из `createTraceBus`. */
  capacity?: number;
}

export interface IProfilerProviderProps {
  children: JSX.Element;
  /** Размер per-metric history-ring (`createMetricsBus`). */
  historySize?: number;
  /** Trace-канал жизненного цикла. Отсутствие/тогл-off = канал создан, но молчит. */
  trace?: IProfilerTraceConfig;
  /** Готовый metrics-bus (тесты / переиспользование). */
  bus?: IMetricsBus;
  /** Готовый trace-bus (тесты / переиспользование). */
  traceBus?: ITraceBus;
}

/**
 * Тонкий оркестратор-хаб (ADR 063 D2). Несёт ТОЛЬКО свою логику:
 * - создаёт `MetricsBus` + `TraceBus` и провайдит их через контекст;
 * - регистрирует trace-sink (module-level `trace()` потечёт в trace-bus);
 * - применяет app-baseline тогла trace.
 *
 * **НЕ импортит ни одного сабмодуля** — ни коллекторов, ни reporters, ни
 * Dashboard. Их потребитель монтит как children (`/collectors`, `/reporters`,
 * `/widget`), где угодно в дереве; они само-регистрируются через контекст.
 * Так импорт провайдера тянет в бандл только шину/контекст, не perf+UI.
 */
export function ProfilerProvider(props: IProfilerProviderProps) {
  const bus = props.bus ?? createMetricsBus({ historySize: props.historySize });
  // Trace-bus создаётся всегда (дешёвый ring) — чтобы рантайм-тогл `trace.enable()`
  // и читатели trace работали даже без явного `trace`-конфига. Тогл off по умолчанию
  // → ноль событий, пока не включат.
  const traceBus = props.traceBus ?? createTraceBus({ capacity: props.trace?.capacity });

  onMount(() => {
    const unregister = registerTraceSink({ emit: (e) => traceBus.push(e) });
    if (props.trace) {
      const { capacity: _capacity, ...toggle } = props.trace;
      configureTrace(toggle);
    }
    onCleanup(unregister);
  });

  return (
    <ProfilerContext.Provider value={bus}>
      <TraceContext.Provider value={traceBus}>{props.children}</TraceContext.Provider>
    </ProfilerContext.Provider>
  );
}
