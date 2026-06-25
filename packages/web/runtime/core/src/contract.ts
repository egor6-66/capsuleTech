/**
 * defineContract — фабрика публичного контракта ремоут-аппа (ADR 060 Phase 1).
 *
 * ADR 060: встраиваемое приложение объявляет **явный публичный интерфейс** (in/out
 * события) Zod-схемой. Эта схема — single source для:
 *  - **типов** (`z.infer` через `InEvents`/`OutEvents` — host типизирует `on*` + dispatch);
 *  - **runtime-валидации** (`validateEvent` — фильтр host↔app, ADR 059 D4);
 *  - **design-time рендера** в студии (Phase 4).
 *
 * Семантика осей:
 *  - `in`  — host→app: события, диспатчащиеся в корень встроенного приложения.
 *  - `out` — app→host: корневой surface приложения (что оно эмитит наружу).
 *
 * Автор аппа пишет `apps/<app>/contract.ts`:
 * ```ts
 * export default defineContract((z) => ({
 *   in:  { setTheme: z.object({ theme: z.string() }) },
 *   out: { onLogin: z.object({ token: z.string() }) },
 * }));
 * ```
 *
 * Артефакт-эмит (json-schema / d.ts / mjs) и `DEFINE_FACTORIES`-регистрация — отдельный
 * brief (builders 2-of-2). Здесь — контракт + типы + runtime-валидатор.
 *
 * @module
 */

import { type CapsuleZ, Zod, type ZodTypeAny } from '@capsuletech/shared-zod';

/**
 * Публичный интерфейс встроенного приложения.
 *
 * `in` — host→app (диспатч в корень), `out` — app→host (корневой surface).
 * Каждое событие — Zod-схема его payload'а.
 */
export interface IContract {
  in: Record<string, ZodTypeAny>;
  out: Record<string, ZodTypeAny>;
}

/**
 * Identity-фабрика контракта. `z` (CapsuleZ из `@capsuletech/shared-zod`) инжектится —
 * автор НЕ импортирует zod напрямую (как `defineAppConfig`/`defineEndpoint`).
 *
 * Дженерик `<C extends IContract>` + возврат `C` (а НЕ `IContract`) сохраняют **точные**
 * типы каждой схемы: `IContract` стирает их до `ZodTypeAny`, но возвращая `C`, мы отдаём
 * литеральный тип, по которому `InEvents`/`OutEvents` выводят корректный `z.infer`.
 * Это тот же canon, что zod-standalone (сохранять generic'и, иначе `z.infer` ломается).
 */
export const defineContract = <C extends IContract>(build: (z: CapsuleZ) => C): C => build(Zod);

/** Результат `validateEvent` — discriminated union по `ok`. */
export type IValidateResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/**
 * Валидирует payload события по контракту. Используется host-стороной (Phase 3):
 * на приёме app→host (`dir: 'out'`) и при диспатче host→app (`dir: 'in'`) — фильтр ADR 059 D4.
 *
 * @param contract  — контракт встроенного аппа.
 * @param dir       — ось: `'in'` (host→app) или `'out'` (app→host).
 * @param eventName — имя события в соответствующей оси.
 * @param payload   — сырой payload для проверки.
 * @returns `{ ok: true, value }` (распаршенное значение) либо `{ ok: false, error }`
 *          с читаемым `path: message` (или `Unknown <dir> event "<name>"`).
 */
export const validateEvent = (
  contract: IContract,
  dir: 'in' | 'out',
  eventName: string,
  payload: unknown,
): IValidateResult => {
  const schema = contract[dir][eventName];
  if (!schema) {
    return { ok: false, error: `Unknown ${dir} event "${eventName}"` };
  }

  const result = schema.safeParse(payload);
  if (result.success) {
    return { ok: true, value: result.data };
  }

  const issue = result.error.issues[0];
  const path = issue && issue.path.length > 0 ? issue.path.join('.') : '(root)';
  return { ok: false, error: `${path}: ${issue?.message ?? 'invalid payload'}` };
};

/**
 * Мапа out-событий → payload-тип (`z.infer`). Host типизирует `on*`-хендлеры.
 *
 * `C['out'][K]['_output']` — каноническая форма `z.infer` (zod определяет
 * `infer<T> = T['_output']`); работает по точным типам, т.к. `C` — литеральный
 * возврат `defineContract`, не стёртый `IContract`.
 */
export type OutEvents<C extends IContract> = { [K in keyof C['out']]: C['out'][K]['_output'] };

/** Мапа in-событий → payload-тип (`z.infer`). Host типизирует dispatch host→app. */
export type InEvents<C extends IContract> = { [K in keyof C['in']]: C['in'][K]['_output'] };
