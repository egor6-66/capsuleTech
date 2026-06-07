import type { ZodTypeAny } from '@capsuletech/shared-zod';
import type { z } from 'zod';

/**
 * Результат Entity factory — plain config объект с zod-схемой и опциональными
 * дефолтами. Не является компонентом — Entity не рендерится.
 *
 * Generic `TSchema` — тип zod-схемы (любой ZodType).
 * Generic `TDefaults` — тип массива дефолтов (infer'ится из `schema` автоматически
 * через wrapper).
 */
export interface IEntityDefinition<TSchema = unknown, TDefaults = unknown> {
  /** Zod-схема domain-объекта (или массива). */
  schema: TSchema;
  /** Дефолтные данные — примеры / sample fixtures для разработки и тестов. */
  defaults?: TDefaults;
}

/**
 * Фабрика Entity — функция без аргументов, возвращающая
 * `IEntityDefinition`-совместимый объект.
 *
 * Zod-схема строится через глобал `Zod` (auto-import из `@capsuletech/shared-zod`).
 *
 * Generic `T` — тип возвращаемого definition. Используется wrapper'ом
 * чтобы пробросить структуру без потери информации о полях.
 */
export type IEntityFactory<T extends IEntityDefinition> = () => T;

/**
 * Публичный тип wrapper-функции `Entity`.
 *
 * `Entity(() => ({ schema: Zod.array(...), defaults: [...] }))` возвращает
 * plain config object с дополнительным phantom-полем `$infer`.
 *
 * Zod-схема строится через глобал `Zod` (auto-import из `@capsuletech/shared-zod`).
 * Аргумент `z` убран — factory теперь без параметров (breaking change).
 *
 * Phantom `$infer` — **только тип**, рантайм его не создаёт.
 * Consumer использует `typeof Entities.X.$infer`:
 *
 * ```ts
 * type IUser  = typeof Entities.Users.$infer;             // z.infer<schema>
 * type IRow   = typeof Entities.Users.$infer[number];     // если schema — массив
 * ```
 *
 * Wrapper намеренно прозрачен (identity по значению):
 *  - нет Solid-обёртки, нет lazy, нет компонента;
 *  - factory вызывается на module-load time;
 *  - результат — frozen plain object.
 *
 * В будущем (Phase 2): сюда попадут validators, transforms, relations.
 */
export type IEntityWrapper = <
  TSchema extends ZodTypeAny,
  TDefaults = unknown,
  T extends IEntityDefinition<TSchema, TDefaults> = IEntityDefinition<TSchema, TDefaults>,
>(
  factory: () => T,
) => T & { readonly $infer: z.infer<TSchema> };
