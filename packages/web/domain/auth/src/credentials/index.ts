/**
 * @capsuletech/web-auth/credentials — СТРАТЕГИЯ: логин + пароль (cookie-флоу).
 *
 * Работает поверх backend/auth (ADR 068): `POST /auth/register|login` →
 * Set-Cookie `capsule_session` (httpOnly), `POST /auth/logout` → ревокация,
 * `GET /auth/me` → user | 401 (guest). Фронт токен НЕ видит и НЕ возит —
 * носитель сессии кука, запросы с `credentials: 'same-origin'`.
 *
 * Блок экспортирует:
 *  - `credentialsStrategy(config?)` — фабрика стратегии (config-driven поля
 *    login/password для AuthLoginForm);
 *  - HTTP-клиент: `loginRequest` / `registerRequest` / `logoutRequest` /
 *    `meRequest` + `userOutSchema` + типизированные ошибки
 *    (`InvalidCredentialsError` 401 / `LoginTakenError` 409 / `AuthApiError`);
 *  - `logoutCredentials(apiBase?)` — полный логаут-флоу: ревокация на сервере
 *    + сброс session-store + BroadcastChannel-оповещение остальных вкладок.
 *
 * Connected-блоки (`Auth.Login type="credentials"`, `Auth.Register`) — в
 * `/controllers`; они строят стратегию из props и дёргают этот клиент.
 */

import { logoutRequest } from '../api/client';
import { defaultAuthSession, notifyAuthChanged } from '../session/index';
import type { IAuthFormField, IAuthSessionStore, IAuthStrategy } from '../types';

// ─── Публичный реэкспорт HTTP-клиента ─────────────────────────────────────────

export {
  AuthApiError,
  DEFAULT_API_BASE,
  type ICredentialsBody,
  InvalidCredentialsError,
  LoginTakenError,
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  userOutSchema,
} from '../api/client';

// ─── Стратегия ────────────────────────────────────────────────────────────────

/** Input стратегии «логин+пароль». */
export interface ICredentialsInput {
  login: string;
  password: string;
}

export interface ICredentialsStrategyConfig {
  /** Метка поля логина. @default 'Логин' */
  loginLabel?: string;
  /** Метка поля пароля. @default 'Пароль' */
  passwordLabel?: string;
}

export interface ICredentialsStrategy extends IAuthStrategy<ICredentialsInput> {
  fields: ReadonlyArray<IAuthFormField>;
}

/**
 * Фабрика credentialsStrategy — config-driven поля формы login/password.
 *
 * ```ts
 * import { credentialsStrategy } from '@capsuletech/web-auth/credentials';
 * const strategy = credentialsStrategy();
 * ```
 */
export const credentialsStrategy = (
  config: ICredentialsStrategyConfig = {},
): ICredentialsStrategy => ({
  id: 'credentials',
  defaults: { login: '', password: '' },
  fields: [
    {
      tag: 'login',
      type: 'text',
      label: config.loginLabel ?? 'Логин',
      placeholder: 'login',
    },
    {
      tag: 'password',
      type: 'password',
      label: config.passwordLabel ?? 'Пароль',
      placeholder: '•••••••••',
    },
  ],
});

export type CredentialsStrategy = ICredentialsStrategy;

// ─── Полный логаут-флоу ───────────────────────────────────────────────────────

/**
 * Полный логаут cookie-флоу: `POST /auth/logout` (ревокация session-куки на
 * сервере) → сброс session-store → BroadcastChannel-оповещение остальных
 * вкладок/аппов (ADR 068 D4).
 *
 * Локальный сброс выполняется ДАЖЕ если сервер недоступен (пользователь
 * попросил выйти — UI обязан выйти); серверная ревокация тогда логируется
 * warn'ом, кука остаётся до TTL/следующего успешного логаута.
 */
export const logoutCredentials = async (
  apiBase?: string,
  sessionStore: IAuthSessionStore = defaultAuthSession,
): Promise<void> => {
  try {
    await logoutRequest(apiBase);
  } catch (err) {
    console.warn('[web-auth] POST /auth/logout failed — local session cleared anyway:', err);
  }
  sessionStore.logout();
  notifyAuthChanged();
};
