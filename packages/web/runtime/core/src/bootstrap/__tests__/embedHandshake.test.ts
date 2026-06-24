/* @vitest-environment jsdom */
/**
 * embedHandshake.test.ts
 *
 * Unit tests for embed detection + postMessage handshake (ADR 059 Phase 1).
 *
 * Contracts:
 *  - isEmbedded: false in standalone (jsdom: window.parent === window).
 *  - readEmbedParams: parses ?__capsule_session / ?__capsule_name; null without session.
 *  - startHandshake: posts __capsule_app_ready__; routes __capsule_remote_config__ by
 *    sessionId; ignores wrong session / event / addressee; passes raw payload (filter is
 *    downstream); cleanup detaches the listener.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  EMBED_PROTOCOL,
  isEmbedded,
  readEmbedParams,
  startHandshake,
} from '../embedHandshake';

describe('isEmbedded', () => {
  it('is false in standalone (jsdom has no distinct parent)', () => {
    expect(isEmbedded()).toBe(false);
  });
});

describe('readEmbedParams', () => {
  it('parses session + name from query', () => {
    expect(readEmbedParams('?__capsule_session=s1&__capsule_name=app')).toEqual({
      sessionId: 's1',
      name: 'app',
    });
  });

  it('returns null when session is absent', () => {
    expect(readEmbedParams('?__capsule_name=app')).toBeNull();
  });

  it('name defaults to empty string when absent', () => {
    expect(readEmbedParams('?__capsule_session=s1')).toEqual({ sessionId: 's1', name: '' });
  });
});

describe('startHandshake', () => {
  const makeRig = (name = 'app') => {
    const source = new EventTarget();
    const host = { postMessage: vi.fn() };
    const received: Array<Record<string, unknown>> = [];
    const detach = startHandshake({
      params: { sessionId: 's1', name },
      onConfig: (p) => received.push(p),
      host,
      source: source as unknown as Window,
    });
    const dispatch = (data: unknown) =>
      source.dispatchEvent(new MessageEvent('message', { data }));
    return { source, host, received, detach, dispatch };
  };

  it('posts __capsule_app_ready__ to the host with targetOrigin "*"', () => {
    const { host } = makeRig();
    expect(host.postMessage).toHaveBeenCalledTimes(1);
    const [msg, origin] = host.postMessage.mock.calls[0];
    expect(msg).toMatchObject({
      from: 'app',
      fromInstance: 'app',
      to: EMBED_PROTOCOL.hostTarget,
      sessionId: 's1',
      eventName: EMBED_PROTOCOL.readyEvent,
    });
    expect(origin).toBe('*');
  });

  it('routes a config patch with matching sessionId (raw payload, filter is downstream)', () => {
    const { received, dispatch } = makeRig();
    dispatch({
      sessionId: 's1',
      eventName: EMBED_PROTOCOL.configEvent,
      to: 'app',
      payload: { router: { transition: true }, bogus: 1 },
    });
    expect(received).toEqual([{ router: { transition: true }, bogus: 1 }]);
  });

  it('ignores wrong sessionId, wrong eventName, and wrong addressee', () => {
    const { received, dispatch } = makeRig();
    dispatch({ sessionId: 'WRONG', eventName: EMBED_PROTOCOL.configEvent, payload: { a: 1 } });
    dispatch({ sessionId: 's1', eventName: '__capsule_other__', payload: { a: 1 } });
    dispatch({ sessionId: 's1', eventName: EMBED_PROTOCOL.configEvent, to: 'someone-else', payload: { a: 1 } });
    expect(received).toHaveLength(0);
  });

  it('ignores non-object message data', () => {
    const { received, dispatch } = makeRig();
    dispatch('not-an-object');
    dispatch(null);
    expect(received).toHaveLength(0);
  });

  it('cleanup detaches the listener', () => {
    const { received, detach, dispatch } = makeRig();
    detach();
    dispatch({ sessionId: 's1', eventName: EMBED_PROTOCOL.configEvent, to: 'app', payload: { x: 1 } });
    expect(received).toHaveLength(0);
  });
});
