/* @vitest-environment jsdom */
/**
 * EmitProvider.test.tsx
 *
 * Characterization tests for EmitProvider — embedded useEmit routing.
 *
 * Contracts:
 *  1. Without eventSink (standalone) — EmitContext is undefined (no-op wrapper).
 *  2. With eventSink (embedded) — EmitContext provides IEmitSink.
 *  3. eventSink.send is called when IEmitSink.send is invoked via context.
 *  4. Multiple calls to send forward all calls to eventSink.
 *  5. In standalone mode children render without extra context overhead.
 *  6. EmitProvider with null-ish eventSink = standalone (treats undefined as no-op).
 */

import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { EmitContext, EmitProvider, useEmitSink } from '../EmitProvider';

// ---------------------------------------------------------------------------
// Helper: run fn inside a Solid reactive root with EmitProvider
// ---------------------------------------------------------------------------

const runInEmitProvider = <T,>(
  eventSink: Parameters<typeof EmitProvider>[0]['eventSink'],
  fn: () => T,
): T =>
  createRoot((dispose) => {
    let result!: T;
    (EmitProvider as any)({
      eventSink,
      get children() {
        result = fn();
        return null;
      },
    });
    dispose();
    return result;
  });

// ---------------------------------------------------------------------------
// Test: useEmitSink outside EmitProvider — returns undefined
// ---------------------------------------------------------------------------

describe('EmitContext default', () => {
  it('useEmitSink returns undefined when no EmitProvider in tree', () => {
    const result = createRoot((dispose) => {
      const sink = useEmitSink();
      dispose();
      return sink;
    });
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test: standalone mode (no eventSink)
// ---------------------------------------------------------------------------

describe('EmitProvider — standalone mode (no eventSink)', () => {
  it('EmitContext is undefined when eventSink is not provided', () => {
    const result = runInEmitProvider(undefined, () => useEmitSink());
    expect(result).toBeUndefined();
  });

  it('EmitContext is undefined when eventSink is undefined explicitly', () => {
    const result = runInEmitProvider(undefined, () => {
      // Also verify via EmitContext directly
      const ctx = createRoot((d) => {
        let v: ReturnType<typeof useEmitSink>;
        (EmitContext.Provider as any)({
          value: undefined,
          get children() {
            v = useEmitSink();
            return null;
          },
        });
        d();
        return v;
      });
      return ctx;
    });
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test: embedded mode (eventSink provided)
// ---------------------------------------------------------------------------

describe('EmitProvider — embedded mode (eventSink provided)', () => {
  it('useEmitSink returns IEmitSink with send method', () => {
    const mockSend = vi.fn();
    const eventSink = { send: mockSend };

    const sink = runInEmitProvider(eventSink, () => useEmitSink());

    expect(sink).not.toBeUndefined();
    expect(typeof sink!.send).toBe('function');
  });

  it('sink.send delegates to eventSink.send with correct args', () => {
    const mockSend = vi.fn();
    const eventSink = { send: mockSend };

    const sink = runInEmitProvider(eventSink, () => useEmitSink());
    sink!.send('onLogin', { userId: 42 });

    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledWith('onLogin', { userId: 42 });
  });

  it('sink.send without payload calls eventSink.send with event name', () => {
    const mockSend = vi.fn();
    const eventSink = { send: mockSend };

    const sink = runInEmitProvider(eventSink, () => useEmitSink());
    sink!.send('mounted');

    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0]).toBe('mounted');
  });

  it('multiple sink.send calls all forwarded to eventSink', () => {
    const mockSend = vi.fn();
    const eventSink = { send: mockSend };

    const sink = runInEmitProvider(eventSink, () => useEmitSink());
    sink!.send('event1', 'a');
    sink!.send('event2', 'b');
    sink!.send('event3', 'c');

    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(mockSend.mock.calls[0]).toEqual(['event1', 'a']);
    expect(mockSend.mock.calls[1]).toEqual(['event2', 'b']);
    expect(mockSend.mock.calls[2]).toEqual(['event3', 'c']);
  });

  it('eventSink with request/on methods — send still works (duck typing)', () => {
    const mockSend = vi.fn();
    // IRemoteChannel has more methods — structural compat should work
    const fullChannel = {
      send: mockSend,
      request: vi.fn(),
      on: vi.fn(),
    };

    // IEmitSink only cares about send — passes fullChannel as IEmitSink
    const sink = runInEmitProvider(fullChannel as any, () => useEmitSink());
    sink!.send('testEvent', { data: 1 });

    expect(mockSend).toHaveBeenCalledWith('testEvent', { data: 1 });
  });
});

// ---------------------------------------------------------------------------
// Test: isolation (nested providers override outer)
// ---------------------------------------------------------------------------

describe('EmitProvider — nested providers', () => {
  it('inner EmitProvider overrides outer', () => {
    const outerSend = vi.fn();
    const innerSend = vi.fn();
    const outer = { send: outerSend };
    const inner = { send: innerSend };

    const innerSink = createRoot((dispose) => {
      let result!: ReturnType<typeof useEmitSink>;
      (EmitProvider as any)({
        eventSink: outer,
        get children() {
          (EmitProvider as any)({
            eventSink: inner,
            get children() {
              result = useEmitSink();
              return null;
            },
          });
          return null;
        },
      });
      dispose();
      return result;
    });

    innerSink!.send('nested', 'payload');
    expect(innerSend).toHaveBeenCalledWith('nested', 'payload');
    expect(outerSend).not.toHaveBeenCalled();
  });
});
