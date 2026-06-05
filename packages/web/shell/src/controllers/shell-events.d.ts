/**
 * Global namespace augmentation — Shell.Matrix.Events (ADR 032).
 *
 * Позволяет в app-коде писать:
 *   `Feature<Shell.Matrix.Events>(...)` или `Feature<EventsOf<typeof Shell.Matrix>>(...)`
 *
 * `declare const Shell` в .capsule/@types/slots.d.ts (codegen) декларирует Shell как
 * value; `namespace Shell` здесь — type-side augmentation. TypeScript разрешает merge
 * `const Shell + namespace Shell` — value и namespace живут в разных "пространствах"
 * одного идентификатора (аналог `class + namespace` merge).
 *
 * В самом пакете web-shell глобал Shell от codegen отсутствует (нет .capsule/registry),
 * поэтому namespace объявлен как standalone (без reference на value).
 * В apps/ewc, где codegen генерит `declare const Shell`, merge происходит автоматически:
 *   value Shell (codegen) + namespace Shell (это объявление) → Shell.Matrix.Events резолвится
 *   в типовой позиции; `<Shell.Matrix ... />` работает в значенческой.
 *
 * Верификация merge на скретче (без codegen):
 *   declare const Shell: { Matrix: typeof MatrixController };
 *   namespace Shell { namespace Matrix { type Events = IMatrixEvents } }
 *   type T = Shell.Matrix.Events;  // → IMatrixEvents — OK (value+namespace merge)
 */

import type { IMatrixEvents } from '../matrix/interfaces';

declare global {
  namespace Shell {
    namespace Matrix {
      type Events = IMatrixEvents;
    }
  }
}
