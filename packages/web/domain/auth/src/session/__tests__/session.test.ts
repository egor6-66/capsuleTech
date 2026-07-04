/**
 * /session v2 — тесты cookie-first session-store + useAuth() + initAuthSession
 * bootstrap + legacy role-mock персиста.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configureAuthSession,
  createAuthSession,
  defaultAuthSession,
  emptySession,
  initAuthSession,
  localSessionStorage,
  useAuth,
} from '../index';

const USER = { id: 1, login: 'alice', role: 'developer' };

describe('emptySession (v2)', () => {
  it('status=idle, user=null — БЕЗ token в модели', () => {
    expect(emptySession).toEqual({ user: null, status: 'idle' });
    expect('token' in emptySession).toBe(false);
  });
});

describe('createAuthSession()', () => {
  it('начальный статус idle (guest)', () => {
    const store = createAuthSession();
    expect(store.session.status).toBe('idle');
    expect(store.session.user).toBeNull();
  });

  it('login(user) обновляет user/status', () => {
    const store = createAuthSession();
    store.login(USER);

    expect(store.session.user).toEqual(USER);
    expect(store.session.status).toBe('authed');
  });

  it('logout() сбрасывает сессию к guest', () => {
    const store = createAuthSession();
    store.login(USER);
    store.logout();

    expect(store.session.user).toBeNull();
    expect(store.session.status).toBe('idle');
  });

  it('setStatus() меняет только status', () => {
    const store = createAuthSession();
    store.login(USER);
    store.setStatus('submitting');

    expect(store.session.status).toBe('submitting');
    expect(store.session.user?.role).toBe('developer');
  });

  it('экземпляры изолированы', () => {
    const a = createAuthSession();
    const b = createAuthSession();
    a.login(USER);

    expect(b.session.user).toBeNull();
  });
});

describe('useAuth() (v2 — без token)', () => {
  it('читает user/role/status из переданного store', () => {
    const store = createAuthSession();
    const auth = useAuth(store);

    expect(auth.isAuthed).toBe(false);
    expect(auth.role).toBeNull();
    expect(auth.status).toBe('idle');

    store.login(USER);

    expect(auth.isAuthed).toBe(true);
    expect(auth.role).toBe('developer');
    expect(auth.user?.login).toBe('alice');
    expect(auth.status).toBe('authed');
  });

  it('token в API отсутствует (cookie-first)', () => {
    const auth = useAuth(createAuthSession());
    expect('token' in auth).toBe(false);
  });

  it('isAuthed = false при status не "authed"', () => {
    const store = createAuthSession();
    const auth = useAuth(store);

    store.setStatus('submitting');
    expect(auth.isAuthed).toBe(false);

    store.setStatus('error');
    expect(auth.isAuthed).toBe(false);
  });
});

// ─── Legacy: localSessionStorage (role-mock опора, @deprecated) ──────────────

describe('localSessionStorage (legacy role-mock, jsdom)', () => {
  const KEY = 'test-session-storage';

  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it('getSession() возвращает null если ключа нет', () => {
    expect(localSessionStorage(KEY).getSession()).toBeNull();
  });

  it('setSession → getSession round-trip ({ user }, без token)', () => {
    const s = localSessionStorage(KEY);
    s.setSession({ user: USER });
    expect(s.getSession()).toEqual({ user: USER });
  });

  it('clearSession → null', () => {
    const s = localSessionStorage(KEY);
    s.setSession({ user: USER });
    s.clearSession();
    expect(s.getSession()).toBeNull();
  });

  it('невалидный JSON → null (без исключения)', () => {
    localStorage.setItem(KEY, 'not-json{{');
    expect(localSessionStorage(KEY).getSession()).toBeNull();
  });

  it('запись без user.role → null', () => {
    localStorage.setItem(KEY, JSON.stringify({ user: { login: 'x' } }));
    expect(localSessionStorage(KEY).getSession()).toBeNull();
  });

  it('v1-запись ({ token, user }) читается: user извлекается, token отбрасывается', () => {
    localStorage.setItem(KEY, JSON.stringify({ token: 'stale-v1', user: { role: 'developer' } }));
    expect(localSessionStorage(KEY).getSession()).toEqual({ user: { role: 'developer' } });
  });
});

describe('createAuthSession() с legacy ISessionStorage', () => {
  const KEY = 'test-session-create';

  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it('rehydrate: валидная запись → status authed', () => {
    localSessionStorage(KEY).setSession({ user: USER });

    const store = createAuthSession(localSessionStorage(KEY));
    expect(store.session.status).toBe('authed');
    expect(store.session.user).toEqual(USER);
  });

  it('login() персистит { user }', () => {
    const storage = localSessionStorage(KEY);
    const store = createAuthSession(storage);
    store.login({ role: 'support' });

    expect(storage.getSession()).toEqual({ user: { role: 'support' } });
  });

  it('logout() очищает хранилище', () => {
    const storage = localSessionStorage(KEY);
    const store = createAuthSession(storage);
    store.login(USER);
    store.logout();

    expect(storage.getSession()).toBeNull();
    expect(store.session.status).toBe('idle');
  });
});

describe('configureAuthSession() (legacy role-mock)', () => {
  const KEY = 'test-configure-auth';

  beforeEach(() => {
    localStorage.removeItem(KEY);
    configureAuthSession({ storage: 'memory' });
  });

  afterEach(() => {
    localStorage.removeItem(KEY);
    configureAuthSession({ storage: 'memory' });
  });

  it('storage: "local" с persisted записью → defaultAuthSession rehydrated', () => {
    localSessionStorage(KEY).setSession({ user: USER });

    configureAuthSession({ storage: 'local', key: KEY });

    const auth = useAuth();
    expect(auth.isAuthed).toBe(true);
    expect(auth.role).toBe('developer');
  });

  it('login() через defaultAuthSession пишет { user } в localStorage', () => {
    configureAuthSession({ storage: 'local', key: KEY });

    defaultAuthSession.login({ role: 'support' });

    expect(localSessionStorage(KEY).getSession()).toEqual({ user: { role: 'support' } });
  });

  it('logout() через defaultAuthSession очищает localStorage', () => {
    configureAuthSession({ storage: 'local', key: KEY });
    defaultAuthSession.login(USER);
    defaultAuthSession.logout();

    expect(localSessionStorage(KEY).getSession()).toBeNull();
    expect(useAuth().isAuthed).toBe(false);
  });

  it('storage: "local" без key → бросает ошибку', () => {
    expect(() => configureAuthSession({ storage: 'local' })).toThrow(/key/i);
  });

  it('storage: "memory" сбрасывает к пустому состоянию', () => {
    configureAuthSession({ storage: 'local', key: KEY });
    defaultAuthSession.login(USER);

    configureAuthSession({ storage: 'memory' });

    expect(useAuth().isAuthed).toBe(false);
  });
});

// ─── initAuthSession — bootstrap cookie-сессии (GET /auth/me) ────────────────

describe('initAuthSession()', () => {
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('200 → store authed(user), возвращает user', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, USER));
    const store = createAuthSession();

    const user = await initAuthSession('/api', store);

    expect(user).toEqual(USER);
    expect(store.session.status).toBe('authed');
    expect(store.session.user).toEqual(USER);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('401 → guest (idle, user null) — штатное состояние, без throw', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { detail: 'not authenticated' }));
    const store = createAuthSession();

    const user = await initAuthSession('/api', store);

    expect(user).toBeNull();
    expect(store.session.status).toBe('idle');
    expect(store.session.user).toBeNull();
  });

  it('401 при authed-store → logout (сессия отозвана на сервере)', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    const store = createAuthSession();
    store.login(USER);

    await initAuthSession('/api', store);

    expect(store.session.user).toBeNull();
    expect(store.session.status).toBe('idle');
  });

  it('network-failure → null + warn, состояние store не тронуто, апп не падает', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const store = createAuthSession();

    const user = await initAuthSession('/api', store);

    expect(user).toBeNull();
    expect(store.session.status).toBe('idle');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('кастомный apiBase уходит в /me', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, {}));
    await initAuthSession('/gateway', createAuthSession());
    expect(mockFetch).toHaveBeenCalledWith('/gateway/auth/me', expect.anything());
  });
});
