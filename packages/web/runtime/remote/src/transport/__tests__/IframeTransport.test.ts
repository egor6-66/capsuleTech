/**
 * Tests for IframeTransport.
 * Runs in jsdom environment (window + MessageEvent available).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRemoteMessage } from '../../interfaces';
import { IframeTransport } from '../IframeTransport';

const SESSION = 'test-session';

const makeMsg = (overrides: Partial<IRemoteMessage> = {}): IRemoteMessage => ({
  from: 'module-a',
  fromInstance: 'i1',
  to: 'host',
  toInstance: 'h1',
  sessionId: SESSION,
  eventName: 'test',
  ...overrides,
});

describe('IframeTransport', () => {
  let transport: IframeTransport;

  beforeEach(() => {
    transport = new IframeTransport(SESSION);
  });

  afterEach(() => {
    transport.dispose();
  });

  // ── canReach ─────────────────────────────────────────────────────────────

  it('canReach returns true for non-standalone same-origin', () => {
    expect(
      transport.canReach({ name: 'x', instanceId: 'a', isStandalone: false, sameOrigin: true }),
    ).toBe(true);
  });

  it('canReach returns false for standalone', () => {
    expect(
      transport.canReach({ name: 'x', instanceId: 'a', isStandalone: true, sameOrigin: true }),
    ).toBe(false);
  });

  it('canReach returns false for cross-origin', () => {
    expect(
      transport.canReach({ name: 'x', instanceId: 'a', isStandalone: false, sameOrigin: false }),
    ).toBe(false);
  });

  // ── register + send ───────────────────────────────────────────────────────

  it('send calls postMessage on registered iframe contentWindow', () => {
    const postMessage = vi.fn();
    const iframe = { contentWindow: { postMessage } } as unknown as HTMLIFrameElement;

    transport.register('mod', 'inst', iframe);

    transport.send(
      makeMsg({ to: 'mod', toInstance: 'inst', from: '__host__', fromInstance: '__host__' }),
    );

    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'mod', toInstance: 'inst' }),
      '*',
    );
  });

  it('send does nothing if iframe is not registered', () => {
    // Should not throw
    expect(() => transport.send(makeMsg({ to: 'unknown', toInstance: 'inst' }))).not.toThrow();
  });

  // ── broadcast ─────────────────────────────────────────────────────────────

  it('send broadcasts to all instances of a name when toInstance is undefined', () => {
    const postA = vi.fn();
    const postB = vi.fn();
    const iframeA = { contentWindow: { postMessage: postA } } as unknown as HTMLIFrameElement;
    const iframeB = { contentWindow: { postMessage: postB } } as unknown as HTMLIFrameElement;

    transport.register('geo', 'a', iframeA);
    transport.register('geo', 'b', iframeB);

    // broadcast: toInstance = undefined
    transport.send(
      makeMsg({ to: 'geo', toInstance: undefined, from: '__host__', fromInstance: '__host__' }),
    );

    expect(postA).toHaveBeenCalledOnce();
    expect(postB).toHaveBeenCalledOnce();
  });

  // ── unregister ────────────────────────────────────────────────────────────

  it('unregister prevents further postMessage calls', () => {
    const postMessage = vi.fn();
    const iframe = { contentWindow: { postMessage } } as unknown as HTMLIFrameElement;

    transport.register('mod', 'inst', iframe);
    transport.unregister('mod', 'inst');

    transport.send(makeMsg({ to: 'mod', toInstance: 'inst' }));

    expect(postMessage).not.toHaveBeenCalled();
  });

  // ── onMessage + sessionId filter ─────────────────────────────────────────

  it('onMessage callback is called for messages matching sessionId', () => {
    const cb = vi.fn();
    transport.onMessage(cb);

    const msg = makeMsg({ sessionId: SESSION });
    window.dispatchEvent(new MessageEvent('message', { data: msg }));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(msg);
  });

  it('onMessage callback is NOT called for foreign sessionId', () => {
    const cb = vi.fn();
    transport.onMessage(cb);

    const msg = makeMsg({ sessionId: 'other-session' });
    window.dispatchEvent(new MessageEvent('message', { data: msg }));

    expect(cb).not.toHaveBeenCalled();
  });

  it('onMessage returns unsubscribe function', () => {
    const cb = vi.fn();
    const unsub = transport.onMessage(cb);

    unsub();

    const msg = makeMsg({ sessionId: SESSION });
    window.dispatchEvent(new MessageEvent('message', { data: msg }));

    expect(cb).not.toHaveBeenCalled();
  });

  it('onMessage ignores non-object data', () => {
    const cb = vi.fn();
    transport.onMessage(cb);

    window.dispatchEvent(new MessageEvent('message', { data: 'plain string' }));
    window.dispatchEvent(new MessageEvent('message', { data: null }));
    window.dispatchEvent(new MessageEvent('message', { data: 42 }));

    expect(cb).not.toHaveBeenCalled();
  });

  // ── dispose ───────────────────────────────────────────────────────────────

  it('dispose removes message listener — subsequent messages not received', () => {
    const cb = vi.fn();
    transport.onMessage(cb);

    transport.dispose();

    const msg = makeMsg({ sessionId: SESSION });
    window.dispatchEvent(new MessageEvent('message', { data: msg }));

    expect(cb).not.toHaveBeenCalled();
  });
});
