/**
 * @capsuletech/web-auth/role — СТРАТЕГИЯ: вход по роли.
 *
 * Стартовая стратегия (по playground-прототипу: developer/support, пароль '123',
 * bento-форма). Эталон для остальных стратегий-блоков.
 *
 * Блок = контракт endpoint'а + auth-FSM-конфиг + form-блок (config-driven поля).
 *
 * TODO(owner-web-auth): реализовать `roleStrategy: IAuthStrategy<{ role; password }>`:
 *   - fields: декларация Select(role) + Input(password) для form-блока (/ui);
 *   - вызов `services.api.auth.login({ strategy:'role', input })` (контракт /auth/login);
 *   - резолв ответа → session + событие onLogin.
 * Миграция из apps/playground (features/auth + endpoints/auth + views/authForm).
 */

import type { IAuthStrategy } from '../types';

/** Input стратегии «по роли». */
export interface IRoleInput {
  role: string;
  password: string;
}

// TODO(owner-web-auth): export const roleStrategy: IAuthStrategy<IRoleInput> = { ... }
export type RoleStrategy = IAuthStrategy<IRoleInput>;
