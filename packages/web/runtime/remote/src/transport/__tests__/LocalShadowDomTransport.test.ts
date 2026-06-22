/**
 * Tests for LocalShadowDomTransport — ADR 057 Phase 1B.
 *
 * Covers the in-realm dispatch contract: canReach narrowing, microtask
 * delivery, sessionId isolation between Providers, unsubscribe, dispose.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IRemoteMessage } from '../../interfaces';
import { LocalShadowDomTransport } from '../LocalShadowDomTransport';

const SESSION = 'sess-shadow-test';

const makeMessage = (overrides: Partial<IRemoteMessage> = {}): IRemoteMessage => ({
  from: '__host__',
  fromInstance: '__host__',
  to: 'mod',
  toInstance: 'inst-1',
  sessionId: SESSION,
  eventName: 'event',
  payload: undefined,
  ...overrides,
});

describe('LocalShadowDomTransport', () => {
  let transport: LocalShadowDomTransport;

  beforeEach(() => {
    transport = new LocalShadowDomTransport(SESSION);
  });

  afterEach(() => {
    transport.dispose();
  });

  it('reports kind = "local-shadow-dom"', () => {
    expect(transport.kind).toBe('local-shadow-dom');
  });

  it('canReach returns true for same-origin embedded targets', () => {
    expect(
      transport.canReach({ name: 'm', instanceId: 'i', isStandalone: false, sameOrigin: true }),
    ).toBe(true);
  });

  it('canReach returns false for standalone targets', () => {
    expect(
      transport.canReach({ name: 'm', instanceId: 'i', isStandalone: true, sameOrigin: true }),
    ).toBe(false);
  });

  it('canReach returns false for cross-origin targets', () => {
    expect(
      transport.canReach({ name: 'm', instanceId: 'i', isStandalone: false, sameOrigin: false }),
    ).toBe(false);
  });

  it('delivers a sent message to every subscriber in a microtask', async () => {
    const received: IRemoteMessage[] = [];
    transport.onMessage((msg) => received.push(msg));
    transport.send(makeMessage({ eventName: 'hello' }));
    // Microtask flush
    await Promise.resolve();
    expect(received).toHaveLength(1);
    expect(received[0]!.eventName).toBe('hello');
  });

  it('passes payload by reference — no JSON serialization', async () => {
    const accessor = () => 42;
    const payload = { count: accessor, raw: { nested: true } };
    const received: IRemoteMessage[] = [];
    transport.onMessage((msg) => received.push(msg));
    transport.send(makeMessage({ payload }));
    await Promise.resolve();
    // The function reference and nested object survive intact — same identity.
    const got = received[0]!.payload as { count: () => number; raw: { nested: boolean } };
    expect(got.count).toBe(accessor);
    expect(got.count()).toBe(42);
    expect(got.raw).toBe(payload.raw);
  });

  it('drops messages with foreign sessionId — Provider isolation', async () => {
    const received: IRemoteMessage[] = [];
    transport.onMessage((msg) => received.push(msg));
    transport.send(makeMessage({ sessionId: 'other-session' }));
    await Promise.resolve();
    expect(received).toHaveLength(0);
  });

  it('unsubscribe removes the listener', async () => {
    const received: IRemoteMessage[] = [];
    const unsub = transport.onMessage((msg) => received.push(msg));
    unsub();
    transport.send(makeMessage());
    await Promise.resolve();
    expect(received).toHaveLength(0);
  });

  it('dispose clears all subscribers', async () => {
    const received: IRemoteMessage[] = [];
    transport.onMessage((msg) => received.push(msg));
    transport.dispose();
    transport.send(makeMessage());
    await Promise.resolve();
    expect(received).toHaveLength(0);
  });

  it('delivers to multiple subscribers', async () => {
    const a: IRemoteMessage[] = [];
    const b: IRemoteMessage[] = [];
    transport.onMessage((msg) => a.push(msg));
    transport.onMessage((msg) => b.push(msg));
    transport.send(makeMessage());
    await Promise.resolve();
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });
});
