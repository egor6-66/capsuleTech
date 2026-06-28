import type { ITraceEvent, ITraceLevel, ITraceSink } from '../core/trace';

/**
 * `@capsuletech/web-profiler/trace` — тонкий emit-субпатч (ADR 062 D2).
 *
 * Module-level (НЕ Solid-хук): `trace()` зовётся из не-компонентного кода —
 * классов (`IframeTransport`), фабрик, helper'ов. Sink регистрирует
 * `ProfilerProvider` на маунте; до этого (и при выключенном тогле) `trace()`
 * делает **мгновенный return ДО сборки события** — ноль аллокаций (D3).
 *
 * Потребитель (web-remote, web-core, …) импортит только этот лёгкий контракт,
 * не таща весь профайлер. Граница = субпатх: видна лишь `trace`-сигнатура.
 */

export type { ITraceEvent, ITraceLevel, ITraceSink } from '../core/trace';

export interface ITraceOpts {
  traceId?: string;
  level?: ITraceLevel;
}

interface ITraceState {
  sink: ITraceSink | null;
  /** Мастер-тогл. `false` → канал молчит целиком. */
  enabled: boolean;
  /** `true` → все узлы; иначе разрешён только набор префиксов в `nodes`. */
  allNodes: boolean;
  nodes: Set<string>;
  minLevel: ITraceLevel;
  counter: number;
  /** Init из localStorage/URL произошёл. */
  hydrated: boolean;
  /** URL `?trace=` присутствует → app-config (`configureTrace`) не перебивает. */
  lockedByUrl: boolean;
}

const STORAGE_KEY = 'capsule.trace';
const LEVEL_ORDER: Record<ITraceLevel, number> = { debug: 0, info: 1, warn: 2 };

// Singleton якорим на globalThis — переживает дублирование модуля между
// субпатх-чанками и независимо собранными пакетами-потребителями в одном
// app-бандле. Без этого sink, зарегистрированный из providers-чанка, был бы
// невидим для trace() из trace-чанка.
const REGISTRY_KEY = Symbol.for('@capsuletech/web-profiler/trace.registry');

function freshState(): ITraceState {
  return {
    sink: null,
    enabled: false,
    allNodes: false,
    nodes: new Set(),
    minLevel: 'debug',
    counter: 0,
    hydrated: false,
    lockedByUrl: false,
  };
}

function getState(): ITraceState {
  const g = globalThis as unknown as Record<symbol, ITraceState | undefined>;
  let st = g[REGISTRY_KEY];
  if (!st) {
    st = freshState();
    g[REGISTRY_KEY] = st;
  }
  if (!st.hydrated) hydrate(st);
  return st;
}

const isBrowser = typeof window !== 'undefined';

/** Применить строковую конфигурацию: `'off'` | `'*'`/`'all'` | `'remote,core'`. */
function applySpec(st: ITraceState, spec: string): void {
  const v = spec.trim().toLowerCase();
  if (v === '' || v === 'off' || v === 'false' || v === '0') {
    st.enabled = false;
    st.allNodes = false;
    st.nodes.clear();
    return;
  }
  if (v === '*' || v === 'all' || v === 'true' || v === '1') {
    st.enabled = true;
    st.allNodes = true;
    st.nodes.clear();
    return;
  }
  st.enabled = true;
  st.allNodes = false;
  st.nodes = new Set(
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Lazy-init из localStorage (baseline) → URL `?trace=` (override, wins). */
function hydrate(st: ITraceState): void {
  st.hydrated = true;
  if (!isBrowser) return;
  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (stored != null) applySpec(st, stored);
  } catch {
    /* localStorage может быть недоступен (privacy mode) — игнорируем */
  }
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('trace');
    if (param != null) {
      applySpec(st, param);
      st.lockedByUrl = true;
    }
  } catch {
    /* no-op */
  }
}

function persist(st: ITraceState): void {
  if (!isBrowser) return;
  try {
    const spec = !st.enabled ? 'off' : st.allNodes ? '*' : [...st.nodes].join(',');
    window.localStorage?.setItem(STORAGE_KEY, spec);
  } catch {
    /* no-op */
  }
}

function nodeAllowed(st: ITraceState, node: string): boolean {
  if (st.allNodes) return true;
  for (const prefix of st.nodes) {
    if (node === prefix || node.startsWith(`${prefix}.`)) return true;
  }
  return false;
}

/**
 * Зарегистрировать sink (вызывает `ProfilerProvider` на маунте). Возвращает
 * unregister. Перезапись существующего sink'а разрешена (последний выигрывает).
 */
export function registerTraceSink(sink: ITraceSink): () => void {
  const st = getState();
  st.sink = sink;
  return () => {
    if (st.sink === sink) st.sink = null;
  };
}

export interface ITraceConfig {
  enabled?: boolean;
  /** `'*'` — все узлы; массив — набор префиксов-категорий. */
  nodes?: string[] | '*';
  level?: ITraceLevel;
}

/**
 * App-config тогла (через `ProfilerProvider trace={...}`). Не перебивает явный
 * URL `?trace=` (debug-намерение пользователя приоритетнее app-дефолта).
 */
export function configureTrace(config: ITraceConfig): void {
  const st = getState();
  if (config.level !== undefined) st.minLevel = config.level;
  if (st.lockedByUrl) return;
  if (config.nodes !== undefined) {
    if (config.nodes === '*') {
      st.allNodes = true;
      st.nodes.clear();
    } else {
      st.allNodes = false;
      st.nodes = new Set(config.nodes);
    }
  }
  if (config.enabled !== undefined) st.enabled = config.enabled;
}

function makeId(st: ITraceState): string {
  st.counter += 1;
  return `t${st.counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emit(
  st: ITraceState,
  traceId: string,
  node: string,
  phase: string,
  data: unknown,
  level: ITraceLevel,
): void {
  // Гард ДО сборки события — порядок дешевизны проверок.
  if (!st.sink || !st.enabled) return;
  if (LEVEL_ORDER[level] < LEVEL_ORDER[st.minLevel]) return;
  if (!nodeAllowed(st, node)) return;
  st.sink.emit({ traceId, node, phase, level, data, ts: Date.now() });
}

export interface ITraceFn {
  (node: string, phase: string, data?: unknown, opts?: ITraceOpts): void;
  /** Включить узел/категорию (или `'*'`). Включает мастер-тогл + персистит. */
  enable(category: string): void;
  /** Выключить узел/категорию. `'*'` — выключить канал целиком. Персистит. */
  disable(category: string): void;
  setLevel(level: ITraceLevel): void;
  /** Эмиттит ли узел сейчас (с учётом мастера + фильтра). Без аргумента — мастер. */
  isEnabled(node?: string): boolean;
}

/**
 * Разовое событие. Если `opts.traceId` не задан — рождает свой id (одиночный
 * span). Для причинной цепочки используй `startTrace()` + `span()`.
 */
export const trace: ITraceFn = Object.assign(
  (node: string, phase: string, data?: unknown, opts?: ITraceOpts): void => {
    const st = getState();
    if (!st.sink || !st.enabled) return; // быстрый выход без аллокации id
    const id = opts?.traceId ?? makeId(st);
    emit(st, id, node, phase, data, opts?.level ?? 'debug');
  },
  {
    enable(category: string): void {
      const st = getState();
      st.enabled = true;
      if (category === '*') st.allNodes = true;
      else st.nodes.add(category);
      persist(st);
    },
    disable(category: string): void {
      const st = getState();
      if (category === '*') {
        st.enabled = false;
        st.allNodes = false;
        st.nodes.clear();
      } else {
        st.nodes.delete(category);
      }
      persist(st);
    },
    setLevel(level: ITraceLevel): void {
      getState().minLevel = level;
    },
    isEnabled(node?: string): boolean {
      const st = getState();
      if (!st.enabled) return false;
      return node === undefined ? true : nodeAllowed(st, node);
    },
  },
);

/** Родить `traceId` для причинной цепочки (birth→death). */
export function startTrace(): string {
  return makeId(getState());
}

/** Событие под существующим `traceId` (звено цепочки). */
export function span(
  traceId: string,
  node: string,
  phase: string,
  data?: unknown,
  opts?: Omit<ITraceOpts, 'traceId'>,
): void {
  const st = getState();
  if (!st.sink || !st.enabled) return;
  emit(st, traceId, node, phase, data, opts?.level ?? 'debug');
}

/** Опциональная сахар-обёртка для компонент-скоупа. Та же module-level API. */
export function useTrace(): {
  trace: ITraceFn;
  startTrace: typeof startTrace;
  span: typeof span;
} {
  return { trace, startTrace, span };
}

/** Сброс singleton'а — только для тестов. */
export function __resetTrace(): void {
  const g = globalThis as unknown as Record<symbol, ITraceState | undefined>;
  g[REGISTRY_KEY] = freshState();
}
