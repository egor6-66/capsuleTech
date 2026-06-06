/**
 * Global namespace augmentation — Tables.DataTable.Events (ADR 032).
 *
 * Позволяет в app-коде писать:
 *   `Feature<Tables.DataTable.Events>(...)` или `Feature<EventsOf<typeof Tables.DataTable>>(...)`
 *
 * `declare const Tables` в .capsule/@types/slots.d.ts (codegen) декларирует Tables как
 * value; `namespace Tables` здесь — type-side augmentation. TypeScript разрешает merge
 * `const Tables + namespace Tables` — value и namespace живут в разных "пространствах"
 * одного идентификатора (аналог `class + namespace` merge).
 *
 * В самом пакете web-table глобал Tables от codegen отсутствует (нет .capsule/registry),
 * поэтому namespace объявлен как standalone (без reference на value).
 * В apps/ewc, где codegen генерит `declare const Tables`, merge происходит автоматически:
 *   value Tables (codegen) + namespace Tables (это объявление) → Tables.DataTable.Events резолвится
 *   в типовой позиции; `<Tables.DataTable ... />` работает в значенческой.
 */

import type { IDataTableEvents } from './interfaces';

declare global {
  namespace Tables {
    namespace DataTable {
      type Events = IDataTableEvents;
    }
  }
}
