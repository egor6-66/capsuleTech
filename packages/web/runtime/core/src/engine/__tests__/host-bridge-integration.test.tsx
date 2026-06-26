/* @vitest-environment jsdom */
/**
 * host-bridge-integration.test.tsx
 *
 * Integration: host→app inbound event injected into the ROOT logic-wrapper only
 * (ADR 060 D1). Renders real Controller(s) under HostInboundContext.
 *
 * Contracts:
 *  1. inbound.emit dispatches into the root Controller as a normal HCA event (target.payload set).
 *  2. Only the root (parent === undefined) subscribes — a nested Controller does NOT receive it.
 *  3. After unmount the dispatcher is unregistered (emit no longer reaches the handler).
 */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LogicWrapper calls useRouter() unconditionally; stub it so a bare Controller can
// mount without a full RouterProvider tree (we only exercise the host-bridge path).
vi.mock('@capsuletech/web-router', () => ({
  useRouter: () => ({ goTo: () => {}, back: () => {}, current: () => '/', raw: {} }),
}));

import { ControllerWrapper } from '../../wrappers/controller';
import { useCtx } from '../ctx';
import {
  createHostInbound,
  HostInboundContext,
  type IRootForward,
  RootForwardContext,
} from '../host-bridge';

/** Tiny child that captures the nearest ctx (root or nested) for direct dispatch. */
function Probe(props: { onCtx: (c: any) => void }) {
  props.onCtx(useCtx());
  return null;
}

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

describe('host-bridge integration', () => {
  it('injects an inbound host event into the root Controller (target.payload set)', () => {
    const rootHandler = vi.fn(async (_api: any) => null);
    const Root = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { setMarkers: rootHandler } },
    })) as any;

    const inbound = createHostInbound();
    cleanup = render(
      () => (
        <HostInboundContext.Provider value={inbound}>
          <Root />
        </HostInboundContext.Provider>
      ),
      container,
    );

    inbound.emit('setMarkers', [{ id: 1 }]);

    expect(rootHandler).toHaveBeenCalledTimes(1);
    const api = rootHandler.mock.calls[0][0] as { target: { payload?: unknown } };
    expect(api.target.payload).toEqual([{ id: 1 }]);
  });

  it('only the root subscribes — a nested Controller does not receive inbound events', () => {
    const rootHandler = vi.fn(async () => null);
    const nestedHandler = vi.fn(async () => null);

    const Nested = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { setMarkers: nestedHandler } },
    })) as any;
    const Root = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { setMarkers: rootHandler } },
    })) as any;

    const inbound = createHostInbound();
    cleanup = render(
      () => (
        <HostInboundContext.Provider value={inbound}>
          <Root>
            <Nested />
          </Root>
        </HostInboundContext.Provider>
      ),
      container,
    );

    inbound.emit('setMarkers', { x: 1 });

    expect(rootHandler).toHaveBeenCalledTimes(1);
    expect(nestedHandler).not.toHaveBeenCalled();
  });

  it('unregisters the dispatcher on unmount', () => {
    const rootHandler = vi.fn(async () => null);
    const Root = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { ping: rootHandler } },
    })) as any;

    const inbound = createHostInbound();
    cleanup = render(
      () => (
        <HostInboundContext.Provider value={inbound}>
          <Root />
        </HostInboundContext.Provider>
      ),
      container,
    );

    inbound.emit('ping', 1);
    expect(rootHandler).toHaveBeenCalledTimes(1);

    cleanup();
    cleanup = undefined;
    inbound.emit('ping', 2);
    expect(rootHandler).toHaveBeenCalledTimes(1); // no new delivery after unmount
  });
});

describe('app→host forward-from-root (ADR 060 D1)', () => {
  const outForward = (forward: ReturnType<typeof vi.fn>): IRootForward => ({
    shouldForward: (name) => name === 'markerClick',
    forward: forward as IRootForward['forward'],
  });

  it('forwards an out event reaching the root INSTEAD of running the local handler', () => {
    const forward = vi.fn();
    const handler = vi.fn(async (_api: any) => null);
    const Root = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { markerClick: handler } },
    })) as any;

    let captured: any;
    cleanup = render(
      () => (
        <RootForwardContext.Provider value={outForward(forward)}>
          <Root>
            <Probe onCtx={(c) => (captured = c)} />
          </Root>
        </RootForwardContext.Provider>
      ),
      container,
    );

    captured.controller.markerClick({ payload: { id: 1 } });

    expect(forward).toHaveBeenCalledWith('markerClick', { id: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs the local handler (no forward) in standalone — no RootForwardContext', () => {
    const handler = vi.fn(async (_api: any) => null);
    const Root = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { markerClick: handler } },
    })) as any;

    let captured: any;
    cleanup = render(
      () => (
        <Root>
          <Probe onCtx={(c) => (captured = c)} />
        </Root>
      ),
      container,
    );

    captured.controller.markerClick({ payload: { id: 1 } });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT forward an event not in out — runs the local handler', () => {
    const forward = vi.fn();
    const handler = vi.fn(async (_api: any) => null);
    const Root = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { internalThing: handler } },
    })) as any;

    let captured: any;
    cleanup = render(
      () => (
        <RootForwardContext.Provider value={outForward(forward)}>
          <Root>
            <Probe onCtx={(c) => (captured = c)} />
          </Root>
        </RootForwardContext.Provider>
      ),
      container,
    );

    captured.controller.internalThing({ payload: { x: 1 } });

    expect(forward).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('a NESTED controller handles the out-named event locally (gate is root-only)', () => {
    const forward = vi.fn();
    const nestedHandler = vi.fn(async (_api: any) => null);
    const Root = ControllerWrapper(() => ({ initial: 'idle', states: { idle: {} } })) as any;
    const Nested = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { markerClick: nestedHandler } },
    })) as any;

    let nestedCtx: any;
    cleanup = render(
      () => (
        <RootForwardContext.Provider value={outForward(forward)}>
          <Root>
            <Nested>
              <Probe onCtx={(c) => (nestedCtx = c)} />
            </Nested>
          </Root>
        </RootForwardContext.Provider>
      ),
      container,
    );

    nestedCtx.controller.markerClick({ payload: { id: 9 } });

    expect(nestedHandler).toHaveBeenCalledTimes(1);
    expect(forward).not.toHaveBeenCalled();
  });

  it('an out event bubbling from a nested controller (no local handler) forwards at the root', () => {
    const forward = vi.fn();
    const nestedHandler = vi.fn(async (_api: any) => null);
    const Root = ControllerWrapper(() => ({ initial: 'idle', states: { idle: {} } })) as any;
    // Nested has NO markerClick handler → ControllerProxy auto-bubbles via next() to root.
    const Nested = ControllerWrapper(() => ({
      initial: 'idle',
      states: { idle: { other: nestedHandler } },
    })) as any;

    let nestedCtx: any;
    cleanup = render(
      () => (
        <RootForwardContext.Provider value={outForward(forward)}>
          <Root>
            <Nested>
              <Probe onCtx={(c) => (nestedCtx = c)} />
            </Nested>
          </Root>
        </RootForwardContext.Provider>
      ),
      container,
    );

    nestedCtx.controller.markerClick({ payload: { id: 5 } });

    expect(forward).toHaveBeenCalledWith('markerClick', { id: 5 });
    expect(nestedHandler).not.toHaveBeenCalled();
  });
});
