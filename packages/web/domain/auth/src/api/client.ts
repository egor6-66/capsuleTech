/**
 * Внутренний HTTP-клиент backend/auth (ADR 068 D2/D3) — НЕ публичный subpath.
 *
 * Кука `capsule_session` (httpOnly) — единственный носитель сессии: фронт токен
 * НЕ видит и НЕ возит, все запросы идут с `credentials: 'same-origin'`.
 * Канон single-origin: `apiBase = '/api'` одинаков dev/prod (контракт, не
 * хардкод; gateway маршрутизирует `/api/auth/<rest>` → backend/auth).
 *
 * `apiBase` — явный параметр с дефолтом (образец — web-learn `library/api.ts`:
 * модуль вызывается и вне Solid-scope, контекст не читаем).
 *
 * Ответы валидируются zod-схемой UserOut (`{ id, login, role }` — контракт
 * backend/auth `schemas.py`). Ошибки — типизированные классы: 401 →
 * `InvalidCredentialsError`, 409 → `LoginTakenError`, прочее → `AuthApiError`.
 *
 * Публичный реэкспорт — `@capsuletech/web-auth/credentials`; `/session`
 * использует `meRequest` для bootstrap (`initAuthSession`).
 */

import { z } from '@capsuletech/shared-zod';
import type { IAuthUser } from '../types';

// ─── Контракт ответа (backend UserOut) ────────────────────────────────────────

/** Zod-схема ответа backend/auth (`UserOut`): register/login/me. */
export const userOutSchema = z.object({
  id: z.number(),
  login: z.string(),
  role: z.string(),
});

/** Дефолтный префикс API (single-origin канон, ADR 068). */
export const DEFAULT_API_BASE = '/api';

// ─── Типизированные ошибки ────────────────────────────────────────────────────

/** Базовая ошибка HTTP-клиента auth: любой не-OK ответ, несёт `status`. */
export class AuthApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

/** 401 на `POST /auth/login` — неверная пара логин/пароль. */
export class InvalidCredentialsError extends AuthApiError {
  constructor() {
    super(401, 'invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

/** 409 на `POST /auth/register` — логин уже занят. */
export class LoginTakenError extends AuthApiError {
  constructor() {
    super(409, 'login already taken');
    this.name = 'LoginTakenError';
  }
}

// ─── Внутренние helpers ───────────────────────────────────────────────────────

const jsonInit = (body: unknown): RequestInit => ({
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** Парсит и валидирует UserOut; невалидный ответ = broken contract → бросаем. */
const parseUser = async (res: Response): Promise<IAuthUser> => {
  const parsed = userOutSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new AuthApiError(res.status, '[web-auth] invalid UserOut payload from backend');
  }
  return parsed.data;
};

// ─── Запросы ─────────────────────────────────────────────────────────────────

/** Тело register/login-запросов. */
export interface ICredentialsBody {
  login: string;
  password: string;
}

/**
 * `POST /auth/register` → 201 UserOut + Set-Cookie.
 * @throws LoginTakenError (409) | AuthApiError (прочие не-OK)
 */
export const registerRequest = async (
  body: ICredentialsBody,
  apiBase: string = DEFAULT_API_BASE,
): Promise<IAuthUser> => {
  const res = await fetch(`${apiBase}/auth/register`, jsonInit(body));
  if (res.status === 409) throw new LoginTakenError();
  if (!res.ok) throw new AuthApiError(res.status, `[web-auth] POST /auth/register: ${res.status}`);
  return parseUser(res);
};

/**
 * `POST /auth/login` → 200 UserOut + Set-Cookie.
 * @throws InvalidCredentialsError (401) | AuthApiError (прочие не-OK)
 */
export const loginRequest = async (
  body: ICredentialsBody,
  apiBase: string = DEFAULT_API_BASE,
): Promise<IAuthUser> => {
  const res = await fetch(`${apiBase}/auth/login`, jsonInit(body));
  if (res.status === 401) throw new InvalidCredentialsError();
  if (!res.ok) throw new AuthApiError(res.status, `[web-auth] POST /auth/login: ${res.status}`);
  return parseUser(res);
};

/**
 * `POST /auth/logout` → 204, ревокация session-куки на сервере.
 * @throws AuthApiError (не-OK)
 */
export const logoutRequest = async (apiBase: string = DEFAULT_API_BASE): Promise<void> => {
  const res = await fetch(`${apiBase}/auth/logout`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!res.ok) throw new AuthApiError(res.status, `[web-auth] POST /auth/logout: ${res.status}`);
};

/**
 * `GET /auth/me` → UserOut | null.
 *
 * 401 = guest — ШТАТНОЕ состояние (не ошибка): возвращаем null.
 * @throws AuthApiError (прочие не-OK)
 */
export const meRequest = async (apiBase: string = DEFAULT_API_BASE): Promise<IAuthUser | null> => {
  const res = await fetch(`${apiBase}/auth/me`, { credentials: 'same-origin' });
  if (res.status === 401) return null;
  if (!res.ok) throw new AuthApiError(res.status, `[web-auth] GET /auth/me: ${res.status}`);
  return parseUser(res);
};
