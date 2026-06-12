/**
 * @capsuletech/boost-layout/capsule
 *
 * Manifest пакета для механизма регистрации опциональных пакетов (ADR 033).
 *
 * Подключается одной строкой в `capsule.app.ts`:
 * ```ts
 * packages: ['@capsuletech/boost-layout']
 * ```
 *
 * После регистрации глобал `Layouts.*` доступен во всех слоях:
 *  - `Layouts.Matrix` — Controller-обёрнутая Matrix (ADR 032).
 *    Phantom `__events: IMatrixEvents` → `Feature<Layouts.Matrix.Events>(...)`
 *    типизирует `target.payload` в onLayoutChange.
 *
 * **Two-axis architecture (per ADR 046 D5 amend):**
 * - `Ui.Layout.*` — UI rendering surface (kit Flex+Grid base; boost augments
 *   with Matrix etc.). Single user-facing path. (Augmentation runtime hook —
 *   планируется в D5 implementation; пока через programmatic axis.)
 * - `Layouts.*` — programmatic capability for Controller/Feature layers
 *   (this manifest). Mirror of Maps.*, Tables.*, Charts.* per ADR 033.
 *
 * Naming `Layouts` (plural) — programmatic global per ADR 033. User-facing
 * kit namespace `Ui.Layout` (singular) — augmented at runtime per ADR 046 D5.
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';

import { MatrixController } from './controllers/matrixController';

export default defineCapsuleModule({
  name: 'Layouts',
  components: { Matrix: MatrixController },
});
