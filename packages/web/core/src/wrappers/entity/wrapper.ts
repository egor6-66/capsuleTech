import { Zod } from '@capsuletech/shared-zod';
import type { IEntityDefinition, IEntityFactory, IEntityTools, IEntityWrapper } from './types';

/**
 * Entity wrapper — domain data layer factory (plain config, не компонент).
 *
 * Семантика:
 *  - factory вызывается на module-load time с объектом `{ zod }`;
 *  - zod-схема строится через деструктурированный `zod` из инжектированных инструментов;
 *  - возвращает замороженный plain config object `{ schema, defaults?, ...}`;
 *  - никакого Solid-wrapping, никакой lazy, никакого runtime.
 *
 * Пример:
 * ```ts
 * const Users = Entity(({ zod }) => ({
 *   schema: zod.array(zod.object({ id: zod.string(), name: zod.string() })),
 *   defaults: [{ id: '1', name: 'Alice' }],
 * }));
 *
 * // Consumer:
 * Entities.Users.schema     // zod schema
 * Entities.Users.defaults   // sample array
 * type User = z.infer<typeof Entities.Users.schema>[number]
 * ```
 *
 * Compliance note: Entity не подпадает под UiProxy / ControllerProxy —
 * это pure data layer. HMRWrappingPlugin не трогает Entity-файлы (нет
 * component-wrapper pattern). AutoImport делает `Entity` глобальным в apps
 * через WRAPPER_NAMES (owner-builders).
 */
const entityTools: IEntityTools = { zod: Zod };

const entity = <T extends IEntityDefinition>(factory: IEntityFactory<T>): T => {
  const definition = factory(entityTools);
  return Object.freeze(definition);
};

export const Entity = entity as unknown as IEntityWrapper;
