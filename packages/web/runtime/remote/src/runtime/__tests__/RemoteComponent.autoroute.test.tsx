/**
 * Tests for app→host auto-route into the enclosing host logic-wrapper (brief B / ADR 060 D1).
 *
 * Covers the delivery precedence in RemoteComponent's app→host routing effect:
 *  1. matching `on<Event>` prop present  → prop called, NO emit (explicit escape hatch);
 *  2. no `on<Event>` prop                → emit(eventName, { payload }) (fall through to host HCA);
 *  3. handshake/config envelopes          → neither (filtered by RESERVED_EVENTS);
 *  4. event from a different module name   → neither (matched by name).
 *
 * `useEmitOptional` is mocked here so the fall-through can be asserted without a real
 * Controller/Feature scope. The real "no-op outside logic-scope → no throw" behaviour is
 * covered by @capsuletech/web-core's own use-emit tests (brief Part 1) and by the bare-render
 * "event WITHOUT a matching on* prop is dropped (no throw)" case in RemoteComponent.test.tsx.
 */

import { EMBED_PROTOCOL } from '@capsuletech/web-core/bootstrap';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRemoteMessage, IRemoteModuleConfig, ITransport } from '../../interfaces';

// useEmitOptional returns a shared spy so we can assert the host-logic fall-through.
const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));
vi.mock('@capsuletech/web-core/events', () => ({ useEmitOptional: () => emitSpy }));

import { type IRemoteComponentInternalProps, RemoteComponent } from '../RemoteComponent';

// ─── Mock transport ───────────────────────────────────────────────────────────

type MockTransport = ITransport & {
  triggerMessage: (msg: IRemoteMessage) => void;
};

const makeMockTransport = (): MockTransport => {
  const subscribers = new Set<(msg: IRemoteMessage) => void>();
  return {
    kind: 'post-message',
    triggerMessage: (msg: IRemoteMessage) => {
      for (const cb of subscribers) cb(msg);
    },
    send: () => {},
    onMessage: (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    dispose: () => {},
    register: () => {},
    unregister: () => {},
  } as MockTransport & {
    register: (...args: unknown[]) => void;
    unregister: (...args: unknown[]) => void;
  };
};

const SESSION = 'sess-test';
const APP_ORIGIN = 'http://localhost:3001';

const makeModules = (): Record<string, IRemoteModuleConfig> => ({
  hello: { name: 'hello', url: APP_ORIGIN },
});

describe('RemoteComponent — app→host auto-route into host logic (brief B)', () => {
  let container: HTMLDivElement;
  let disposeRoot: (() => void) | undefined;
  let transport: MockTransport;

  beforeEach(() => {
    emitSpy.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    transport = makeMockTransport();
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = undefined;
    document.body.removeChild(container);
  });

  const renderRemote = (props: Partial<IRemoteComponentInternalProps> = {}) => {
    const baseProps: IRemoteComponentInternalProps = {
      name: 'hello',
      instanceId: 'inst-1',
      transports: [transport as ITransport],
      sessionId: SESSION,
      modules: makeModules(),
      ...props,
    };
    disposeRoot = render(() => <RemoteComponent {...baseProps} />, container);
  };

  const fire = (eventName: string, payload?: unknown) =>
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'hello',
      to: EMBED_PROTOCOL.hostTarget,
      sessionId: SESSION,
      eventName,
      payload,
    });

  it('forwarded event WITHOUT on<Event> prop → emit(name, { payload })', async () => {
    renderRemote();
    await Promise.resolve();
    fire('canvasClick', { value: 7, ts: 1 });
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('canvasClick', { payload: { value: 7, ts: 1 } });
  });

  it('on<Event> prop present → prop called, emit NOT called (precedence, no double delivery)', async () => {
    const onCanvasClick = vi.fn();
    renderRemote({ onCanvasClick } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    fire('canvasClick', { value: 7 });
    expect(onCanvasClick).toHaveBeenCalledWith({ value: 7 });
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('handshake/config envelopes → neither on<Event> nor emit (RESERVED_EVENTS)', async () => {
    renderRemote();
    await Promise.resolve();
    for (const eventName of [
      EMBED_PROTOCOL.readyEvent,
      EMBED_PROTOCOL.mountedEvent,
      EMBED_PROTOCOL.unloadEvent,
      EMBED_PROTOCOL.configEvent,
    ]) {
      fire(eventName);
    }
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('event from a different module name → emit NOT called', async () => {
    renderRemote();
    await Promise.resolve();
    transport.triggerMessage({
      from: 'other-module',
      fromInstance: 'other-module',
      to: EMBED_PROTOCOL.hostTarget,
      sessionId: SESSION,
      eventName: 'canvasClick',
      payload: { value: 1 },
    });
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
