/**
 * @capsuletech/web-table/capsule — registration manifest (ADR 033).
 *
 * App mounts via `capsule.app.ts: packages: ['@capsuletech/web-table']` → global
 * `Tables.*` (mirror of Shell.Matrix / Maps.View extraction). Component map is
 * populated by the owner-web-table founding task once DataTable/Table move here.
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';

export default defineCapsuleModule({
  name: 'Tables',
  components: {},
});
