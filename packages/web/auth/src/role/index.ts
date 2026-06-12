/**
 * @capsuletech/web-auth/role — СТРАТЕГИЯ: вход по роли.
 *
 * Стартовая стратегия (по playground-прототипу: developer/support, пароль).
 * Эталон для остальных стратегий-блоков.
 *
 * Блок = zod-схемы контракта `/auth/login` + декларация полей формы.
 * Роли — параметр конфига roleStrategy({ roles: [...] }), НЕ хардкод.
 *
 * Экспортирует:
 *  - `loginRequestSchema` / `loginResponseSchema` — zod-схемы для app defineEndpoint
 *  - `IRoleInput`, `IRoleLoginRequest`, `IRoleLoginResponse` — TS-типы
 *  - `roleStrategy(config)` — фабрика стратегии с config-driven полями
 *  - `RoleStrategy` — тип
 */

import { z } from '@capsuletech/shared-zod';
import type { IAuthStrategy } from '../types';

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

export const loginResponseSchema = z.object({
  token: z.string(),
  role: z.string(),
  /** Опциональный user-объект. Если не вернул backend — собираем из role. */
  user: z
    .object({
      id: z.string().optional(),
      role: z.string(),
      name: z.string().optional(),
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

/** Тип одного поля формы для config-driven рендера в LoginForm. */
export type AuthFieldType = 'select' | 'password' | 'text';

export interface IAuthFormField {
  /** Уникальный тег поля — передаётся как `meta.tags: [tag]` в форму. */
  tag: string;
  type: AuthFieldType;
  label: string;
  placeholder?: string;
  /** Опции для select-поля. */
  options?: ReadonlyArray<{ value: string; label: string }>;
  /** Значение по умолчанию. */
  defaultValue?: string;
}

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
