/**
 * /capsule — тест wiring'а services.authApi.init (bootstrap из app-слоя).
 *
 * Баг ревью волны: initAuthSession был реализован, но недостижим из аппа
 * (канон no-imports). Контракт: `services.authApi.init(apiBase?)` прокидывает
 * apiBase в initAuthSession (GET /auth/me → store + broadcast-подписка)
 * и возвращает user | null.
 *
 * Регистрация — side-effect импорта capsule.ts; перехватываем её моком
 * `registerPackageServices` (getPackageServices — internal web-core, наружу
 * не экспортирован) и дёргаем захваченный authApi как это делает Feature.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Перехват регистрации ─────────────────────────────────────────────────────

// vi.hoisted: контейнер должен существовать ДО hoisted-импорта capsule.ts
// (регистрация — side-effect импорта, выполняется раньше тела модуля теста).
const captured = vi.hoisted(() => ({ authApi: null as Record<string, unknown> | null }));

vi.mock('@capsuletech/web-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-core')>();
  return {
    ...actual,
    registerPackageServices: (namespace: string, services: Record<string, unknown>) => {
      if (namespace === 'authApi') captured.authApi = services;
    },
  };
});

// ─── Импорт после мока (side-effect: registerPackageServices('authApi', …)) ──

import authModule from '../capsule';
import { defaultAuthSession } from '../session/index';
import type { IAuthUser } from '../types';

type AuthApi = {
  init: (apiBase?: string) => Promise<IAuthUser | null>;
  logout: () => void;
  logoutServer: (apiBase?: string) => Promise<void>;
  isAuthed: () => boolean;
  user: () => IAuthUser | null;
};

const authApi = captured.authApi as unknown as AuthApi;

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
  defaultAuthSession.logout();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('манифест модуля (defineCapsuleModule)', () => {
  it('components: Login, Register, Gate — все зарегистрированы', () => {
    const { name, components } = authModule as unknown as {
      name: string;
      components: Record<string, unknown>;
    };
    expect(name).toBe('Auth');
    expect(Object.keys(components).sort()).toEqual(['Gate', 'Login', 'Register']);
    for (const component of Object.values(components)) {
      expect(typeof component).toBe('function');
    }
  });
});

describe('services.authApi.init()', () => {
  it('зарегистрирован под namespace authApi', () => {
    expect(authApi).not.toBeNull();
    expect(typeof authApi.init).toBe('function');
  });

  it('200 → defaultAuthSession authed(user), возвращает user; дефолтный apiBase=/api', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, USER));

    const user = await authApi.init();

    expect(user).toEqual(USER);
    expect(authApi.isAuthed()).toBe(true);
    expect(authApi.user()).toEqual(USER);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('401 → null (guest), store остаётся idle', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { detail: 'not authenticated' }));

    const user = await authApi.init();

    expect(user).toBeNull();
    expect(authApi.isAuthed()).toBe(false);
    expect(authApi.user()).toBeNull();
  });

  it('кастомный apiBase прокидывается в initAuthSession', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, {}));

    await authApi.init('/gateway');

    expect(mockFetch).toHaveBeenCalledWith('/gateway/auth/me', expect.anything());
  });
});
