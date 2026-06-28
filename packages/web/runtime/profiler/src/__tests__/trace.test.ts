import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTraceBus, type ITraceEvent } from '../core/trace';
import { __resetTrace, configureTrace, registerTraceSink, span, startTrace, trace } from '../trace';

describe('traceBus', () => {
  const ev = (over: Partial<ITraceEvent> = {}): ITraceEvent => ({
    traceId: 't1',
    node: 'remote.transport',
    phase: 'ctor',
    level: 'debug',
    ts: 1,
    ...over,
  });

  it('keeps events in insertion order via all()', () => {
    const bus = createTraceBus();
    bus.push(ev({ phase: 'ctor' }));
    bus.push(ev({ phase: 'subscribe' }));
    expect(bus.all().map((e) => e.phase)).toEqual(['ctor', 'subscribe']);
  });

  it('groups by traceId in arrival order (byTrace)', () => {
    const bus = createTraceBus();
    bus.push(ev({ traceId: 'a', phase: 'ctor' }));
    bus.push(ev({ traceId: 'b', phase: 'mount' }));
    bus.push(ev({ traceId: 'a', phase: 'dispose' }));
    expect(bus.byTrace('a').map((e) => e.phase)).toEqual(['ctor', 'dispose']);
    expect(bus.byTrace('b').map((e) => e.phase)).toEqual(['mount']);
  });

  it('lists unique traceIds by first appearance', () => {
    const bus = createTraceBus();
    bus.push(ev({ traceId: 'a' }));
    bus.push(ev({ traceId: 'b' }));
    bus.push(ev({ traceId: 'a' }));
    expect(bus.traceIds()).toEqual(['a', 'b']);
  });

  it('bounds the stream by capacity (ring)', () => {
    const bus = createTraceBus({ capacity: 2 });
    bus.push(ev({ phase: '1' }));
    bus.push(ev({ phase: '2' }));
    bus.push(ev({ phase: '3' }));
    expect(bus.all().map((e) => e.phase)).toEqual(['2', '3']);
  });

  it('notifies subscribers and unsubscribes cleanly', () => {
    const bus = createTraceBus();
    const fn = vi.fn();
    const off = bus.subscribe(fn);
    bus.push(ev());
    off();
    bus.push(ev());
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clear() empties the stream', () => {
    const bus = createTraceBus();
    bus.push(ev());
    bus.clear();
    expect(bus.all()).toHaveLength(0);
  });
});

describe('trace subpatch', () => {
  beforeEach(() => __resetTrace());

  const sinkBus = () => {
    const bus = createTraceBus();
    registerTraceSink({ emit: (e) => bus.push(e) });
    return bus;
  };

  it('is a no-op when no sink is registered (zero events)', () => {
    configureTrace({ enabled: true, nodes: '*' });
    // нет sink — не должно бросать и ничего не эмиттит
    expect(() => trace('remote.transport', 'ctor')).not.toThrow();
  });

  it('is a no-op when toggle is off (default)', () => {
    const bus = sinkBus();
    trace('remote.transport', 'ctor');
    expect(bus.all()).toHaveLength(0);
  });

  it('emits when enabled for the node category', () => {
    const bus = sinkBus();
    configureTrace({ enabled: true, nodes: ['remote'] });
    trace('remote.transport', 'ctor', { size: 2 });
    expect(bus.all()).toHaveLength(1);
    expect(bus.all()[0]).toMatchObject({
      node: 'remote.transport',
      phase: 'ctor',
      data: { size: 2 },
    });
  });

  it('filters by node category — non-matching node stays silent', () => {
    const bus = sinkBus();
    configureTrace({ enabled: true, nodes: ['remote'] });
    trace('core.logic-wrapper', 'dispatch');
    trace('remote.component', 'mount');
    expect(bus.all().map((e) => e.node)).toEqual(['remote.component']);
  });

  it('nodes "*" allows every node', () => {
    const bus = sinkBus();
    configureTrace({ enabled: true, nodes: '*' });
    trace('core.logic-wrapper', 'dispatch');
    trace('remote.component', 'mount');
    expect(bus.all()).toHaveLength(2);
  });

  it('filters by level (minLevel gate)', () => {
    const bus = sinkBus();
    configureTrace({ enabled: true, nodes: '*', level: 'warn' });
    trace('remote.transport', 'subscribe', undefined, { level: 'debug' });
    trace('remote.transport', 'error', undefined, { level: 'warn' });
    expect(bus.all().map((e) => e.phase)).toEqual(['error']);
  });

  it('correlates a causal chain under one traceId via startTrace + span', () => {
    const bus = sinkBus();
    configureTrace({ enabled: true, nodes: '*' });
    const id = startTrace();
    span(id, 'remote.component', 'emit');
    span(id, 'remote.transport', 'forward');
    span(id, 'core.logic-wrapper', 'dispatch');
    const chain = bus.byTrace(id);
    expect(chain.map((e) => e.phase)).toEqual(['emit', 'forward', 'dispatch']);
    expect(bus.traceIds()).toEqual([id]);
  });

  it('trace.enable/disable toggles the runtime channel + per-node', () => {
    const bus = sinkBus();
    trace.enable('remote');
    trace('remote.transport', 'ctor');
    expect(trace.isEnabled('remote.transport')).toBe(true);
    expect(trace.isEnabled('core.x')).toBe(false);
    trace.disable('*');
    trace('remote.transport', 'dispose');
    expect(bus.all()).toHaveLength(1);
  });

  it('span without an enabled channel is a no-op', () => {
    const bus = sinkBus();
    const id = startTrace();
    span(id, 'remote.component', 'emit');
    expect(bus.all()).toHaveLength(0);
  });
});
