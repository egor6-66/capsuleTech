import { createRingBuffer } from './ringBuffer';

/**
 * Trace-канал профайлера — отдельный от MetricsBus поток.
 *
 * MetricsBus дедупит по значению и хранит per-metric — для трейсов нужен
 * **упорядоченный причинный лог** (birth→death), сгруппированный по `traceId`.
 * Инфраструктура `createRingBuffer` переиспользуется, но канал свой (ADR 062 D5).
 */

export type ITraceLevel = 'debug' | 'info' | 'warn';

/** Одно структурное событие жизненного цикла узла. */
export interface ITraceEvent {
  /** Корреляция причинной цепочки (birth→death). См. `startTrace()` / `span()`. */
  traceId: string;
  /** Узел-источник: `'remote.transport' | 'remote.component' | 'core.logic-wrapper' | …`. */
  node: string;
  /** Фаза: `'ctor' | 'mount' | 'subscribe' | 'forward' | 'deliver' | 'dispose' | …`. */
  phase: string;
  level: ITraceLevel;
  /** Payload узла (counts, ids, размер Set, и т.п.). */
  data?: unknown;
  ts: number;
}

/** Sink, который `ProfilerProvider` регистрирует в trace-registry на маунте. */
export interface ITraceSink {
  emit(event: ITraceEvent): void;
}

export type ITraceListener = (event: ITraceEvent) => void;

export interface ITraceBus {
  /** Положить событие в поток (вызывается зарегистрированным sink'ом). */
  push(event: ITraceEvent): void;
  /** Все события в порядке поступления (oldest→newest). */
  all(): readonly ITraceEvent[];
  /** События одного `traceId` в порядке поступления — пошаговый ретрейс. */
  byTrace(traceId: string): readonly ITraceEvent[];
  /** Уникальные `traceId`, присутствующие в текущем окне (порядок первого появления). */
  traceIds(): readonly string[];
  subscribe(fn: ITraceListener): () => void;
  clear(): void;
}

export interface ICreateTraceBusOpts {
  /** Размер кольца событий. По умолчанию 500. */
  capacity?: number;
}

const DEFAULT_CAPACITY = 500;

export function createTraceBus(opts: ICreateTraceBusOpts = {}): ITraceBus {
  const capacity = opts.capacity ?? DEFAULT_CAPACITY;
  let ring = createRingBuffer<ITraceEvent>(capacity);
  const listeners = new Set<ITraceListener>();

  return {
    push(event) {
      ring.push(event);
      for (const fn of listeners) fn(event);
    },
    all() {
      return ring.toArray();
    },
    byTrace(traceId) {
      return ring.toArray().filter((e) => e.traceId === traceId);
    },
    traceIds() {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const e of ring.toArray()) {
        if (!seen.has(e.traceId)) {
          seen.add(e.traceId);
          out.push(e.traceId);
        }
      }
      return out;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    clear() {
      ring = createRingBuffer<ITraceEvent>(capacity);
    },
  };
}
