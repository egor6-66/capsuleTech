/**
 * @capsuletech/web-menu/capsule — registration manifest (ADR 033).
 *
 * App mounts via `capsule.app.ts: packages: ['@capsuletech/web-menu']` → global
 * `Menus.*` (mirror of Tables.* / Maps.*). Currently SKELETON — no components are
 * registered yet; the data-driven `Menu` (from `/dropdown`) is added with the
 * renderer (ADR 044).
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';

export default defineCapsuleModule({
  name: 'Menus',
  components: {
    // TODO(web-menu): Dropdown: MenuController  (once /dropdown renderer lands)
  },
});
