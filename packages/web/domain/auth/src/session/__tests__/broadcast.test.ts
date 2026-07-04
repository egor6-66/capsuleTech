/**
 * /session broadcast — тесты BroadcastChannel-синка 'capsule-auth' (ADR 068 D4).
 *
 * Fake BroadcastChannel: доставка между инстансами одного имени, БЕЗ
 * self-delivery (как в реальном API) — вкладка-инициатор не получает своё
 * сообщение.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetAuthChannelForTests,
  AUTH_CHANNEL_NAME,
  notifyAuthChanged,
  onAuthChanged,
} from '../broadcast';
import { createAuthSession, initAuthSession } from '../index';

// ─── Fake BroadcastChannel ────────────────────────────────────────────────────

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  readonly name: string;
  private listeners: Array<(e: MessageEvent) => void> = [];

  constructor(name: string) {
    this.name = name;
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(data: unknown): void {
    for (const inst of FakeBroadcastChannel.instances) {
      if (inst !== this && inst.name === this.name) {
        for (const l of inst.listeners) l({ data } as MessageEvent);
      }
    }
  }

  addEventListener(_type: string, listener: (e: MessageEvent) => void): void {
    this.listeners.push(listener);
  }

  removeEventListener(_type: string, listener: (e: MessageEvent) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  close(): void {
    this.listeners = [];
  }
}

/** Эмуляция «другой вкладки»: отдельный инстанс канала того же имени. */
const otherTab = () => new FakeBroadcastChannel(AUTH_CHANNEL_NAME);

beforeEach(() => {
  FakeBroadcastChannel.instances = [];
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  _resetAuthChannelForTests();
});

afterEach(() => {
  _resetAuthChannelForTests();
  vi.unstubAllGlobals();
});

describe('notifyAuthChanged / onAuthChanged', () => {
  it('канал называется capsule-auth (контракт ADR 068 D4)', () => {
    expect(AUTH_CHANNEL_NAME).toBe('capsule-auth');
  });

  it('сообщение из другой вкладки → handler вызван', () => {
    const handler = vi.fn();
    onAuthChanged(handler);

    otherTab().postMessage({ type: 'auth-changed' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('чужие сообщения в канале игнорируются', () => {
    const handler = vi.fn();
    onAuthChanged(handler);

    otherTab().postMessage({ type: 'something-else' });
    otherTab().postMessage(null);

    expect(handler).not.toHaveBeenCalled();
  });

  it('notifyAuthChanged() доставляется в другую вкладку', () => {
    const tab = otherTab();
    const received: unknown[] = [];
    tab.addEventListener('message', (e) => received.push(e.data));

    notifyAuthChanged();

    expect(received).toEqual([{ type: 'auth-changed' }]);
  });

  it('собственный notifyAuthChanged НЕ триггерит собственный onAuthChanged (shared instance)', () => {
    const handler = vi.fn();
    onAuthChanged(handler);

    notifyAuthChanged();

    expect(handler).not.toHaveBeenCalled();
  });

  it('отписка снимает handler', () => {
    const handler = vi.fn();
    const unsubscribe = onAuthChanged(handler);
    unsubscribe();

    otherTab().postMessage({ type: 'auth-changed' });

    expect(handler).not.toHaveBeenCalled();
  });
});

// ─── Интеграция: initAuthSession подписывает вкладку на синк ─────────────────

describe('initAuthSession + broadcast-синк', () => {
  const mockFetch = vi.fn();

  const jsonResponse = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('login в другой вкладке → эта вкладка ре-фетчит /me и становится authed', async () => {
    // Bootstrap: guest (401)
    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    const store = createAuthSession();
    await initAuthSession('/api', store);
    expect(store.session.status).toBe('idle');

    // «Другая вкладка» залогинилась: /me теперь 200
    const USER = { id: 7, login: 'bob', role: 'user' };
    mockFetch.mockResolvedValue(jsonResponse(200, USER));
    otherTab().postMessage({ type: 'auth-changed' });

    await vi.waitFor(() => {
      expect(store.session.status).toBe('authed');
      expect(store.session.user).toEqual(USER);
    });
  });

  it('logout в другой вкладке → эта вкладка сбрасывается в guest', async () => {
    const USER = { id: 7, login: 'bob', role: 'user' };
    mockFetch.mockResolvedValue(jsonResponse(200, USER));
    const store = createAuthSession();
    await initAuthSession('/api', store);
    expect(store.session.status).toBe('authed');

    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    otherTab().postMessage({ type: 'auth-changed' });

    await vi.waitFor(() => {
      expect(store.session.status).toBe('idle');
      expect(store.session.user).toBeNull();
    });
  });

  it('повторный initAuthSession не дублирует подписку (один ре-фетч на сообщение)', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    const store = createAuthSession();
    await initAuthSession('/api', store);
    await initAuthSession('/api', store);

    mockFetch.mockClear();
    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    otherTab().postMessage({ type: 'auth-changed' });

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
