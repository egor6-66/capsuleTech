/**
 * /session — тесты session-store + useAuth().
 */

import { describe, expect, it } from 'vitest';
import {
  createAuthSession,
  emptySession,
  localStorageStorage,
  memoryStorage,
  useAuth,
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

  it('login() сохраняет токен в переданное storage', () => {
    const storage = memoryStorage();
    const store = createAuthSession(storage);
    store.login('stored-token', { role: 'admin' });

    expect(storage.get()).toBe('stored-token');
  });

  it('logout() очищает storage', () => {
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
