/**
 * @capsuletech/web-shell/capsule — registration manifest (ADR 033).
 *
 * Declares the package's HCA surface so an app can mount it via
 * `capsule.app.ts: packages:` and get `Shell.*` components (and, later,
 * `Controllers.Shell`) on the global registry without per-app wiring.
 *
 * Until ADR 033 phase 3 lands (the package-registration runtime), apps consume
 * these blocks through a direct import from `@capsuletech/web-shell/ui`. The
 * manifest is kept in place so the contract is stable once the runtime ships.
 *
 * Shell.Matrix — Controller-обёрнутая версия (из /controllers), не raw /matrix.
 * Несёт phantom __events: IMatrixEvents → EventsOf<typeof Shell.Matrix> работает
 * в Feature<Shell.Matrix.Events>(...) (ADR 032).
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';

import { MatrixController } from './controllers/matrixController';
import { Header, ModeToggle, ThemePicker } from './ui';

export default defineCapsuleModule({
  name: 'Shell',
  components: { Header, ModeToggle, ThemePicker, Matrix: MatrixController },
});
