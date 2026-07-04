/**
 * /credentials — тесты стратегии (config-driven поля) + logoutCredentials
 * (полный логаут-флоу: сервер + store + broadcast).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthSession } from '../../session/index';
import { credentialsStrategy, logoutCredentials } from '../index';

describe('credentialsStrategy()', () => {
  it('id = credentials, поля login (text) + password (password)', () => {
    const s = credentialsStrategy();

    expect(s.id).toBe('credentials');
    expect(s.fields).toHaveLength(2);
    expect(s.fields[0]).toMatchObject({ tag: 'login', type: 'text', label: 'Логин' });
    expect(s.fields[1]).toMatchObject({ tag: 'password', type: 'password', label: 'Пароль' });
  });

  it('defaults — пустые login/password', () => {
    expect(credentialsStrategy().defaults).toEqual({ login: '', password: '' });
  });

  it('кастомные метки полей', () => {
    const s = credentialsStrategy({ loginLabel: 'Email', passwordLabel: 'Ключ' });
    expect(s.fields[0].label).toBe('Email');
    expect(s.fields[1].label).toBe('Ключ');
  });

  it('invalidCredentialsMessage не задан → используется дефолт контроллера («Неверный логин или пароль»)', () => {
    expect(credentialsStrategy().invalidCredentialsMessage).toBeUndefined();
  });
});

describe('logoutCredentials()', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('успех: POST /auth/logout + сброс store', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    const store = createAuthSession();
    store.login({ id: 1, login: 'alice', role: 'user' });

    await logoutCredentials('/api', store);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    );
    expect(store.session.user).toBeNull();
    expect(store.session.status).toBe('idle');
  });

  it('сервер недоступен: локальный сброс ВСЁ РАВНО выполняется (+warn)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const store = createAuthSession();
    store.login({ id: 1, login: 'alice', role: 'user' });

    await logoutCredentials('/api', store);

    expect(store.session.user).toBeNull();
    expect(store.session.status).toBe('idle');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
