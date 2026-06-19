/**
 * Tests for createHostHandle.
 */

import { describe, expect, it, vi } from 'vitest';
import type { IRemoteMessage, ITransport } from '../../interfaces';
import { createHostHandle } from '../createHostHandle';

const SESSION = 'sess-1';
const NAME = 'geo';
const INSTANCE_ID = 'left';

const makeMockTransport = (): ITransport & {
  sent: IRemoteMessage[];
  triggerMessage: (msg: IRemoteMessage) => void;
} => {
  const sent: IRemoteMessage[] = [];
  const subscribers = new Set<(msg: IRemoteMessage) => void>();

  return {
    kind: 'post-message',
    sent,
    triggerMessage: (msg: IRemoteMessage) => {
      for (const cb of subscribers) cb(msg);
    },
    canReach: () => true,
    send: (msg) => sent.push(msg),
    onMessage: (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    dispose: () => {},
  };
};

describe('createHostHandle', () => {
  it('send produces correct envelope shape', () => {
    const transport = makeMockTransport();
    const handle = createHostHandle(NAME, INSTANCE_ID, [transport], SESSION);

    handle.send('user.sync', { id: 1 });

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]).toMatchObject({
      from: '__host__',
      fromInstance: '__host__',
      to: NAME,
      toInstance: INSTANCE_ID,
      sessionId: SESSION,
      eventName: 'user.sync',
      payload: { id: 1 },
    });
  });

  it('on subscribes and receives matching messages', () => {
    const transport = makeMockTransport();
    const handle = createHostHandle(NAME, INSTANCE_ID, [transport], SESSION);

    const cb = vi.fn();
    handle.on('clicked', cb);

    transport.triggerMessage({
      from: NAME,
      fromInstance: INSTANCE_ID,
      to: '__host__',
      sessionId: SESSION,
      eventName: 'clicked',
      payload: { ts: 123 },
    });

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith({ ts: 123 });
  });

  it('on returns unsubscribe — stops receiving after unsub', () => {
    const transport = makeMockTransport();
    const handle = createHostHandle(NAME, INSTANCE_ID, [transport], SESSION);

    const cb = vi.fn();
    const unsub = handle.on('clicked', cb);
    unsub();

    transport.triggerMessage({
      from: NAME,
      fromInstance: INSTANCE_ID,
      to: '__host__',
      sessionId: SESSION,
      eventName: 'clicked',
    });

    expect(cb).not.toHaveBeenCalled();
  });

  it('on does not fire for messages from a different instance', () => {
    const transport = makeMockTransport();
    const handle = createHostHandle(NAME, INSTANCE_ID, [transport], SESSION);

    const cb = vi.fn();
    handle.on('clicked', cb);

    transport.triggerMessage({
      from: NAME,
      fromInstance: 'other-instance',
      to: '__host__',
      sessionId: SESSION,
      eventName: 'clicked',
    });

    expect(cb).not.toHaveBeenCalled();
  });

  it('request resolves on isResponse: true message', async () => {
    const transport = makeMockTransport();
    const handle = createHostHandle(NAME, INSTANCE_ID, [transport], SESSION);

    const promise = handle.request<{ data: string }>('user.get', { id: 42 });

    // Simulate response
    const sentMsg = transport.sent[0]!;
    transport.triggerMessage({
      from: NAME,
      fromInstance: INSTANCE_ID,
      to: '__host__',
      sessionId: SESSION,
      eventName: 'user.get',
      requestId: sentMsg.requestId,
      isResponse: true,
      status: 'success',
      payload: { data: 'Alice' },
    });

    const result = await promise;
    expect(result.status).toBe('success');
    expect(result.payload).toEqual({ data: 'Alice' });
  });

  it('request rejects on timeout', async () => {
    const transport = makeMockTransport();
    const handle = createHostHandle(NAME, INSTANCE_ID, [transport], SESSION);

    const promise = handle.request('user.get', undefined, 10);

    await expect(promise).rejects.toThrow(/timed out/);
  });

  it('openStandalone does not throw and logs console.warn', () => {
    const transport = makeMockTransport();
    const handle = createHostHandle(NAME, INSTANCE_ID, [transport], SESSION);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let result: unknown;

    // Must not throw — ADR-053 acceptance gate
    expect(() => {
      result = handle.openStandalone({ foo: 'bar' });
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('openStandalone'));
    // Returns undefined
    expect(result).toBeUndefined();

    warnSpy.mockRestore();
  });
});
