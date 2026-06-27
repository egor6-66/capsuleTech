/**
 * Сабмодули-children само-регистрируются через контекст (ADR 063 D2).
 *
 * Контракт:
 *  1. Collector-компонент на маунте дёргает `collector.init(bus)`, на unmount —
 *     cleanup (слушатели снимаются).
 *  2. Reporter-компонент на маунте подписывается на `MetricsBus` из контекста,
 *     на unmount — отписка.
 *  3. Trace-reporter подписывается на `TraceBus` из `TraceContext`.
 *  4. Тонкий `ProfilerProvider` провайдит обе шины + регистрирует trace-sink:
 *     module-level `trace()` → sink → trace-bus → дочерний trace-reporter.
 *     (Эталон-критерий: trace течёт без коллекторов/Dashboard в проводке.)
 *
 * Рендер через `solid-js/web` (jsdom) — onMount/onCleanup флашатся синхронно.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilerContext } from '../api/useProfiler';
import { TraceContext } from '../api/useTraceBus';
import { ErrorsCollector } from '../collectors/components';
import { createMetricsBus } from '../core/bus';
import { createTraceBus } from '../core/trace';
import { ProfilerProvider } from '../providers/profiler';
import { CallbackReporter, ConsoleReporter, TraceConsoleReporter } from '../reporters/components';
import { __resetTrace, trace } from '../trace';

let container: HTMLDivElement;
let dispose: (() => void) | undefined;

beforeEach(() => {
  __resetTrace();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  container.remove();
  vi.restoreAllMocks();
});

describe('collector component self-registration', () => {
  it('mounts the collector under ProfilerContext and cleans up on unmount', () => {
    const bus = createMetricsBus();
    dispose = render(
      () => (
        <ProfilerContext.Provider value={bus}>
          <ErrorsCollector />
        </ProfilerContext.Provider>
      ),
      container,
    );

    window.dispatchEvent(new Event('error'));
    expect(bus.read('error.js')?.value).toBe(1);

    // unmount → listener снят → счётчик не растёт
    dispose();
    dispose = undefined;
    window.dispatchEvent(new Event('error'));
    expect(bus.read('error.js')?.value).toBe(1);
  });
});

describe('reporter component self-subscription', () => {
  it('ConsoleReporter logs bus writes, stops after unmount', () => {
    const bus = createMetricsBus();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    dispose = render(
      () => (
        <ProfilerContext.Provider value={bus}>
          <ConsoleReporter />
        </ProfilerContext.Provider>
      ),
      container,
    );

    bus.write('lcp', 1200);
    expect(logSpy).toHaveBeenCalledWith('[profiler] LCP = 1200 ms');

    dispose();
    dispose = undefined;
    logSpy.mockClear();
    bus.write('fps', 60);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('CallbackReporter forwards every write to the provided listener', () => {
    const bus = createMetricsBus();
    const fn = vi.fn();

    dispose = render(
      () => (
        <ProfilerContext.Provider value={bus}>
          <CallbackReporter on={fn} />
        </ProfilerContext.Provider>
      ),
      container,
    );

    bus.write('lcp', 1000);
    bus.write('cls', 0.02);
    expect(fn).toHaveBeenCalledTimes(2);

    dispose();
    dispose = undefined;
    bus.write('memory', 42);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('trace flows through the thin provider to a child reporter', () => {
  it('module-level trace() reaches a mounted TraceConsoleReporter', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    dispose = render(
      () => (
        <ProfilerProvider trace={{ enabled: true, nodes: '*' }}>
          <TraceConsoleReporter />
        </ProfilerProvider>
      ),
      container,
    );

    trace('remote.transport', 'ctor', { size: 2 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('remote.transport:ctor');

    // unmount → sink снят → trace() больше не доходит
    dispose();
    dispose = undefined;
    logSpy.mockClear();
    trace('remote.transport', 'dispose');
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('explicit TraceContext bus receives pushed events', () => {
    const traceBus = createTraceBus();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    dispose = render(
      () => (
        <TraceContext.Provider value={traceBus}>
          <TraceConsoleReporter prefix="<t>" />
        </TraceContext.Provider>
      ),
      container,
    );

    traceBus.push({
      traceId: 't1',
      node: 'core.logic-wrapper',
      phase: 'dispatch',
      level: 'debug',
      ts: 1,
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toMatch(/^<t> /);
  });
});
