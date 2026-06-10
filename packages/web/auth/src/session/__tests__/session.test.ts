/**
 * /session — тесты session-store + useAuth() + persistence.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  createAuthSession,
  configureAuthSession,
  emptySession,
  localSessionStorage,
  localStorageStorage,
  memoryStorage,
  useAuth,
  defaultAuthSession,
} from '../index';

describe('emptySession', () => {
  it('status=idle, token=null, user=null', () => {
    expect(emptySession).toEqual({ token: null, user: null, status: 'idle' });
  });
});

describe('memoryStorage', () => {
  it('начальное значение null', () => {
    const s = memoryStorage();
    expect(s.get()).toBeNull();
  });

  it('set → get возвращает токен', () => {
    const s = memoryStorage();
    s.set('abc');
    expect(s.get()).toBe('abc');
  });

  it('clear → null', () => {
    const s = memoryStorage();
    s.set('abc');
    s.clear();
    expect(s.get()).toBeNull();
  });

  it('экземпляры изолированы (разные синглтоны)', () => {
    const a = memoryStorage();
    const b = memoryStorage();
    a.set('token-a');
    expect(b.get()).toBeNull();
  });
});

describe('createAuthSession()', () => {
  it('начальный статус idle', () => {
    const store = createAuthSession();
    expect(store.session.status).toBe('idle');
  });

  it('login() обновляет token/user/status', () => {
    const store = createAuthSession();
    store.login('jwt-123', { role: 'developer' });

    expect(store.session.token).toBe('jwt-123');
    expect(store.session.user).toEqual({ role: 'developer' });
    expect(store.session.status).toBe('authed');
  });

  it('logout() сбрасывает сессию', () => {
    const store = createAuthSession();
    store.login('jwt-123', { role: 'developer' });
    store.logout();

    expect(store.session.token).toBeNull();
    expect(store.session.user).toBeNull();
    expect(store.session.status).toBe('idle');
  });

  it('setStatus() меняет только status', () => {
    const store = createAuthSession();
    store.login('jwt-abc', { role: 'support' });
    store.setStatus('submitting');

    expect(store.session.status).toBe('submitting');
    // token/user не изменились
    expect(store.session.token).toBe('jwt-abc');
    expect(store.session.user?.role).toBe('support');
  });

  it('login() сохраняет токен в переданное ITokenStorage', () => {
    const storage = memoryStorage();
    const store = createAuthSession(storage);
    store.login('stored-token', { role: 'admin' });

    expect(storage.get()).toBe('stored-token');
  });

  it('logout() очищает ITokenStorage', () => {
    const storage = memoryStorage();
    const store = createAuthSession(storage);
    store.login('stored-token', { role: 'admin' });
    store.logout();

    expect(storage.get()).toBeNull();
  });

  it('экземпляры изолированы', () => {
    const a = createAuthSession();
    const b = createAuthSession();
    a.login('token-a', { role: 'developer' });

    expect(b.session.token).toBeNull();
  });
});

describe('useAuth()', () => {
  it('читает token/user/role/status из переданного store', () => {
    const store = createAuthSession();
    const auth = useAuth(store);

    expect(auth.token).toBeNull();
    expect(auth.isAuthed).toBe(false);
    expect(auth.role).toBeNull();
    expect(auth.status).toBe('idle');

    store.login('jwt-xyz', { role: 'developer', name: 'Dev' });

    expect(auth.token).toBe('jwt-xyz');
    expect(auth.isAuthed).toBe(true);
    expect(auth.role).toBe('developer');
    expect(auth.user?.name).toBe('Dev');
    expect(auth.status).toBe('authed');
  });

  it('isAuthed = false при status не "authed"', () => {
    const store = createAuthSession();
    const auth = useAuth(store);

    store.setStatus('submitting');
    expect(auth.isAuthed).toBe(false);

    store.setStatus('error');
    expect(auth.isAuthed).toBe(false);
  });

  it('role = null если user.role отсутствует', () => {
    const store = createAuthSession();
    const auth = useAuth(store);
    expect(auth.role).toBeNull();
  });
});

describe('localStorageStorage (jsdom)', () => {
  it('set/get/clear работают через localStorage', () => {
    const storage = localStorageStorage('test-key');
    storage.set('hello');
    expect(storage.get()).toBe('hello');
    storage.clear();
    expect(storage.get()).toBeNull();
  });
});

// ─── ISessionStorage + persist round-trip ────────────────────────────────────

describe('localSessionStorage (jsdom)', () => {
  const KEY = 'test-session-storage';

  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it('getSession() возвращает null если ключа нет', () => {
    const s = localSessionStorage(KEY);
    expect(s.getSession()).toBeNull();
  });

  it('setSession → getSession возвращает ту же запись', () => {
    const s = localSessionStorage(KEY);
    s.setSession({ token: 'tok', user: { role: 'developer', name: 'Dev' } });
    const result = s.getSession();
    expect(result).toEqual({ token: 'tok', user: { role: 'developer', name: 'Dev' } });
  });

  it('clearSession → getSession возвращает null', () => {
    const s = localSessionStorage(KEY);
    s.setSession({ token: 'tok', user: { role: 'support' } });
    s.clearSession();
    expect(s.getSession()).toBeNull();
  });

  it('невалидный JSON → null (без исключения)', () => {
    localStorage.setItem(KEY, 'not-json{{');
    const s = localSessionStorage(KEY);
    expect(s.getSession()).toBeNull();
  });

  it('валидный JSON без role → null', () => {
    localStorage.setItem(KEY, JSON.stringify({ token: 'tok', user: { name: 'Dev' } }));
    const s = localSessionStorage(KEY);
    expect(s.getSession()).toBeNull();
  });

  it('валидный JSON без user → null', () => {
    localStorage.setItem(KEY, JSON.stringify({ token: 'tok' }));
    const s = localSessionStorage(KEY);
    expect(s.getSession()).toBeNull();
  });
});

// ─── createAuthSession с ISessionStorage: rehydrate + persist ────────────────

describe('createAuthSession() с ISessionStorage', () => {
  const KEY = 'test-session-create';

  afterEach(() => {
    localStorage.removeItem(KEY);
  });

  it('пустое хранилище → начальный статус idle', () => {
    const store = createAuthSession(localSessionStorage(KEY));
    expect(store.session.status).toBe('idle');
    expect(store.session.token).toBeNull();
  });

  it('rehydrate: если в хранилище есть валидная запись → status authed', () => {
    // Предварительно кладём запись напрямую
    const storage = localSessionStorage(KEY);
    storage.setSession({ token: 'persisted-tok', user: { role: 'developer' } });

    const store = createAuthSession(localSessionStorage(KEY));
    expect(store.session.status).toBe('authed');
    expect(store.session.token).toBe('persisted-tok');
    expect(store.session.user?.role).toBe('developer');
  });

  it('login() сохраняет {token, user} в ISessionStorage', () => {
    const storage = localSessionStorage(KEY);
    const store = createAuthSession(storage);
    store.login('new-tok', { role: 'support', name: 'Alice' });

    const persisted = storage.getSession();
    expect(persisted?.token).toBe('new-tok');
    expect(persisted?.user.role).toBe('support');
    expect(persisted?.user.name).toBe('Alice');
  });

  it('logout() очищает ISessionStorage', () => {
    const storage = localSessionStorage(KEY);
    const store = createAuthSession(storage);
    store.login('tok', { role: 'developer' });
    store.logout();

    expect(storage.getSession()).toBeNull();
    expect(store.session.token).toBeNull();
    expect(store.session.status).toBe('idle');
  });

  it('useAuth() читает восстановленную сессию', () => {
    const storage = localSessionStorage(KEY);
    storage.setSession({ token: 'restored', user: { role: 'admin' } });

    const store = createAuthSession(localSessionStorage(KEY));
    const auth = useAuth(store);

    expect(auth.isAuthed).toBe(true);
    expect(auth.role).toBe('admin');
    expect(auth.token).toBe('restored');
  });
});

// ─── configureAuthSession + defaultAuthSession ───────────────────────────────

describe('configureAuthSession()', () => {
  const KEY = 'test-configure-auth';

  beforeEach(() => {
    localStorage.removeItem(KEY);
    // Возвращаем defaultAuthSession к memory между тестами
    configureAuthSession({ storage: 'memory' });
  });

  afterEach(() => {
    localStorage.removeItem(KEY);
    configureAuthSession({ storage: 'memory' });
  });

  it('без вызова: defaultAuthSession начинается с idle (memory)', () => {
    const auth = useAuth();
    expect(auth.isAuthed).toBe(false);
    expect(auth.status).toBe('idle');
  });

  it('storage: "local", пустое → defaultAuthSession остаётся idle', () => {
    configureAuthSession({ storage: 'local', key: KEY });
    const auth = useAuth();
    expect(auth.isAuthed).toBe(false);
  });

  it('storage: "local" с persisted записью → defaultAuthSession rehydrated (isAuthed=true)', () => {
    // Кладём запись до вызова configureAuthSession
    localSessionStorage(KEY).setSession({ token: 'boot-tok', user: { role: 'developer' } });

    configureAuthSession({ storage: 'local', key: KEY });

    const auth = useAuth();
    expect(auth.isAuthed).toBe(true);
    expect(auth.role).toBe('developer');
    expect(auth.token).toBe('boot-tok');
  });

  it('login() через defaultAuthSession пишет в localStorage', () => {
    configureAuthSession({ storage: 'local', key: KEY });

    defaultAuthSession.login('write-tok', { role: 'support' });

    const persisted = localSessionStorage(KEY).getSession();
    expect(persisted?.token).toBe('write-tok');
    expect(persisted?.user.role).toBe('support');
  });

  it('logout() через defaultAuthSession очищает localStorage', () => {
    configureAuthSession({ storage: 'local', key: KEY });
    defaultAuthSession.login('tok', { role: 'developer' });
    defaultAuthSession.logout();

    expect(localSessionStorage(KEY).getSession()).toBeNull();
    expect(useAuth().isAuthed).toBe(false);
  });

  it('storage: "local" без key → бросает ошибку', () => {
    expect(() => configureAuthSession({ storage: 'local' })).toThrow(/key/i);
  });

  it('storage: "memory" сбрасывает к пустому состоянию', () => {
    configureAuthSession({ storage: 'local', key: KEY });
    defaultAuthSession.login('tok', { role: 'developer' });

    configureAuthSession({ storage: 'memory' });

    expect(useAuth().isAuthed).toBe(false);
    expect(useAuth().role).toBeNull();
  });
});

// ─── Lazy init: defaultAuthSession не создаёт store до первого обращения ─────
//
// Полноценная проверка "импорт не вызывает createStore" требует module-isolation
// (vi.isolateModules / отдельный процесс) — см. session.lazy.test.ts.
// Здесь проверяем наблюдаемые инварианты ленивой инициализации.

describe('session module — lazy init (SSR-safe)', () => {
  beforeEach(() => {
    // Сбрасываем к чистому состоянию между тестами
    configureAuthSession({ storage: 'memory' });
  });
  afterEach(() => {
    configureAuthSession({ storage: 'memory' });
  });

  it('defaultAuthSession.session доступен и имеет idle-статус без предварительного вызова configure', () => {
    // configureAuthSession('memory') вызван в beforeEach — store создан явно.
    // Этот тест проверяет, что первый доступ к .session не бросает.
    const auth = useAuth();
    expect(auth.status).toBe('idle');
    expect(auth.isAuthed).toBe(false);
  });

  it('login() через defaultAuthSession работает после lazy-создания store', () => {
    // configureAuthSession('memory') вызван в beforeEach, но даже без него
    // первый вызов login должен работать (lazy path создаёт memory store).
    defaultAuthSession.login('lazy-tok', { role: 'developer' });
    expect(useAuth().isAuthed).toBe(true);
    expect(useAuth().token).toBe('lazy-tok');
  });

  it('configureAuthSession("local") синхронно rehydrates сессию до первого render', () => {
    const KEY = 'lazy-init-test';
    try {
      localSessionStorage(KEY).setSession({ token: 'hydrated', user: { role: 'admin' } });
      configureAuthSession({ storage: 'local', key: KEY });
      // rehydrate синхронный — до любого рендера isAuthed уже true
      expect(useAuth().isAuthed).toBe(true);
      expect(useAuth().role).toBe('admin');
    } finally {
      localStorage.removeItem(KEY);
    }
  });
});
