/**
 * @capsuletech/boost-layout/capsule
 *
 * Манифест пакета для механизма регистрации опциональных пакетов (ADR 033).
 *
 * Подключается одной строкой в `capsule.app.ts`:
 * ```ts
 * packages: ['@capsuletech/boost-layout']
 * ```
 *
 * Currently SCAFFOLD (Phase B1, empty `components`). Matrix component will
 * be contributed in Phase B2 when code is relocated from web-shell:
 *
 * ```ts
 * import { Matrix } from './matrix';
 * export default defineCapsuleModule({
 *   name: 'Layouts',
 *   components: { Matrix },
 * });
 * ```
 *
 * **Naming `Layouts` (plural)** — programmatic global namespace per ADR 033
 * (mirror of `Maps`, `Tables`, `Charts`, …). The user-facing UI namespace is
 * `Ui.Layout` (singular, augmented per ADR 046 Decision 5).
 *
 * **Two-axis architecture (per ADR 046 D5 amend):**
 * - `Ui.Layout.*` — UI rendering surface. Kit ships `{ Flex, Grid }`; boost-layout
 *   augments with `Matrix` (and future heavy variants). Single user-facing path.
 * - `Layouts.*` — programmatic capability for Controller/Feature layers (e.g.
 *   `Layouts.Matrix.create(...)` if such API materialises).
 */

import { defineCapsuleModule } from '@capsuletech/web-core/module';

export default defineCapsuleModule({
  name: 'Layouts',
  components: {},
});
