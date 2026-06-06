/**
 * @capsuletech/web-table/capsule — registration manifest (ADR 033).
 *
 * App mounts via `capsule.app.ts: packages: ['@capsuletech/web-table']` → global
 * `Tables.*` (mirror of Shell.Matrix / Maps.View extraction). DataTable and Table
 * are registered here; app code accesses them as `Tables.DataTable` / `Tables.Table`.
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { DataTable } from './composites/dataTable';
import { Table } from './primitives/table';

export default defineCapsuleModule({
  name: 'Tables',
  components: {
    DataTable,
    Table,
  },
});
