/**
 * api/client — тесты HTTP-клиента backend/auth (мок fetch).
 *
 * Контракт: credentials: 'same-origin' на каждом запросе (кука httpOnly),
 * zod-валидация UserOut, типизированные ошибки (401/409/прочее).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthApiError,
  InvalidCredentialsError,
  LoginTakenError,
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  userOutSchema,
} from '../client';

const mockFetch = vi.fn();

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const USER = { id: 1, login: 'alice', role: 'user' };

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('userOutSchema', () => {
  it('валидирует контракт backend UserOut', () => {
    expect(userOutSchema.safeParse(USER).success).toBe(true);
    expect(userOutSchema.safeParse({ id: '1', login: 'a', role: 'user' }).success).toBe(false);
    expect(userOutSchema.safeParse({ login: 'a', role: 'user' }).success).toBe(false);
  });
});

describe('loginRequest', () => {
  it('POST /auth/login с credentials same-origin + JSON-телом', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, USER));

    const user = await loginRequest({ login: 'alice', password: 'secret123' });

    expect(user).toEqual(USER);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        body: JSON.stringify({ login: 'alice', password: 'secret123' }),
      }),
    );
  });

  it('кастомный apiBase подставляется в URL', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, USER));
    await loginRequest({ login: 'alice', password: 'secret123' }, '/gateway');
    expect(mockFetch).toHaveBeenCalledWith('/gateway/auth/login', expect.anything());
  });

  it('401 → InvalidCredentialsError', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { detail: 'invalid credentials' }));
    await expect(loginRequest({ login: 'alice', password: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('500 → AuthApiError со status', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, { detail: 'boom' }));
    const err = await loginRequest({ login: 'a', password: 'b' }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthApiError);
    expect(err.status).toBe(500);
  });

  it('невалидный UserOut payload → AuthApiError (broken contract)', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { token: 'nope' }));
    await expect(loginRequest({ login: 'a', password: 'b' })).rejects.toBeInstanceOf(AuthApiError);
  });
});

describe('registerRequest', () => {
  it('201 → UserOut', async () => {
    mockFetch.mockResolvedValue(jsonResponse(201, USER));
    const user = await registerRequest({ login: 'alice', password: 'secret123' });
    expect(user).toEqual(USER);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    );
  });

  it('409 → LoginTakenError', async () => {
    mockFetch.mockResolvedValue(jsonResponse(409, { detail: 'login already taken' }));
    await expect(registerRequest({ login: 'alice', password: 'secret123' })).rejects.toBeInstanceOf(
      LoginTakenError,
    );
  });

  it('422 (валидация pydantic) → AuthApiError со status 422', async () => {
    mockFetch.mockResolvedValue(jsonResponse(422, { detail: [] }));
    const err = await registerRequest({ login: 'ab', password: 'short' }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthApiError);
    expect(err.status).toBe(422);
  });
});

describe('meRequest', () => {
  it('200 → UserOut', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, USER));
    const user = await meRequest();
    expect(user).toEqual(USER);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('401 → null (guest — штатное состояние, НЕ ошибка)', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { detail: 'not authenticated' }));
    await expect(meRequest()).resolves.toBeNull();
  });

  it('500 → AuthApiError', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, {}));
    await expect(meRequest()).rejects.toBeInstanceOf(AuthApiError);
  });
});

describe('logoutRequest', () => {
  it('204 → resolve void, POST same-origin', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(logoutRequest()).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'same-origin' }),
    );
  });

  it('500 → AuthApiError', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, {}));
    await expect(logoutRequest()).rejects.toBeInstanceOf(AuthApiError);
  });
});
