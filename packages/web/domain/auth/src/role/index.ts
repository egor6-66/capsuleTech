/**
 * @capsuletech/web-auth/role — СТРАТЕГИЯ: вход по роли (LEGACY mock-опора).
 *
 * Стартовая стратегия playground-прототипа (developer/support, пароль) —
 * работает через app-endpoint с preRequest-моком, БЕЗ бэка. Канонический
 * продовый путь — `/credentials` (cookie-флоу, backend/auth, ADR 068);
 * role остаётся опорой playground и demo-сценариев.
 *
 * Session v2: токен из ответа мок-endpoint'а FSM ИГНОРИРУЕТ — сессия хранит
 * только `{ user, status }` (см. `/session`).
 *
 * Блок = zod-схемы контракта `/auth/login` (мок-вариант) + декларация полей формы.
 * Роли — параметр конфига roleStrategy({ roles: [...] }), НЕ хардкод.
 */

import { z } from '@capsuletech/shared-zod';
import type { IAuthFormField, IAuthStrategy } from '../types';

// ─── Zod-схемы контракта /auth/login (role-стратегия) ─────────────────────────

/**
 * Схема тела POST /auth/login для стратегии 'role'.
 * Апп переиспользует в своём defineEndpoint:
 *   import { loginRequestSchema } from '@capsuletech/web-auth/role';
 *   export const login = defineEndpoint(({ zod }) => ({
 *     method: 'POST', path: '/auth/login',
 *     request: loginRequestSchema,
 *     response: loginResponseSchema,
 *   }));
 */
export const loginRequestSchema = z.object({
  role: z.string().min(1),
  password: z.string(),
});

/**
 * Схема ответа мок-endpoint'а role-стратегии. `token` — артефакт legacy
 * mock-контракта: FSM его игнорирует (session v2 cookie-first, токена в
 * модели нет), но мок-endpoint playground его возвращает.
 */
export const loginResponseSchema = z.object({
  token: z.string(),
  role: z.string(),
  /** Опциональный user-объект. Если не вернул backend — собираем из role. */
  user: z
    .object({
      id: z.number().optional(),
      login: z.string().optional(),
      role: z.string(),
    })
    .optional(),
});

// ─── TS-типы ──────────────────────────────────────────────────────────────────

/** Input стратегии «по роли». */
export interface IRoleInput {
  role: string;
  password: string;
}

// Используем ReturnType-паттерн через safeParse чтобы не зависеть от 'zod' напрямую
// (shared-zod не реэкспортирует namespace z).
type SchemaOutput<T> = T extends { parse: (v: unknown) => infer O } ? O : never;
export type IRoleLoginRequest = SchemaOutput<typeof loginRequestSchema>;
export type IRoleLoginResponse = SchemaOutput<typeof loginResponseSchema>;

// ─── Декларация полей формы ───────────────────────────────────────────────────

// Форм-поля общие для всех стратегий — живут в types.ts; re-export для
// обратной совместимости импортов из /role.
export type { AuthFieldType, IAuthFormField } from '../types';

// ─── Конфигурация стратегии ───────────────────────────────────────────────────

export interface IRoleStrategyConfig {
  /**
   * Список ролей для Select. НЕ хардкод в пакете — апп задаёт.
   * @example [{ value: 'developer', label: 'Developer' }, { value: 'support', label: 'Support' }]
   */
  roles: ReadonlyArray<{ value: string; label: string }>;
  /** Метка поля роли. @default 'Роль' */
  roleLabel?: string;
  /** Метка поля пароля. @default 'Пароль' */
  passwordLabel?: string;
}

// ─── IAuthStrategy расширяем fields ──────────────────────────────────────────

export interface IRoleStrategy extends IAuthStrategy<IRoleInput> {
  fields: ReadonlyArray<IAuthFormField>;
}

/**
 * Фабрика roleStrategy. Создаёт конфиг стратегии с config-driven полями формы.
 *
 * ```ts
 * import { roleStrategy } from '@capsuletech/web-auth/role';
 * const strategy = roleStrategy({ roles: [
 *   { value: 'developer', label: 'Developer' },
 *   { value: 'support', label: 'Support' },
 * ]});
 * ```
 */
export const roleStrategy = (config: IRoleStrategyConfig): IRoleStrategy => ({
  id: 'role',
  // Стратегия по роли не имеет поля «логин» — только роль + пароль.
  // Поэтому invalid-credentials сообщение = «Неверный пароль», не «Неверный логин или пароль».
  invalidCredentialsMessage: 'Неверный пароль',
  defaults: {
    role: config.roles[0]?.value ?? '',
    password: '',
  },
  fields: [
    {
      tag: 'role',
      type: 'select',
      label: config.roleLabel ?? 'Роль',
      options: config.roles,
      defaultValue: config.roles[0]?.value,
    },
    {
      tag: 'password',
      type: 'password',
      label: config.passwordLabel ?? 'Пароль',
      placeholder: '•••••••••',
    },
  ],
});

export type RoleStrategy = IRoleStrategy;
