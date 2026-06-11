/**
 * @capsuletech/boost-table/capsule — registration manifest (ADR 033).
 *
 * App mounts via `capsule.app.ts: packages: ['@capsuletech/boost-table']` → global
 * `Tables.*` (mirror of Shell.Matrix / Maps.View extraction). DataTable and Table
 * are registered here; app code accesses them as `Tables.DataTable` / `Tables.Table`.
 */
import { defineCapsuleModule } from '@capsuletech/web-core/module';
import { DataTableController } from './controllers/dataTableController';
import { Table } from './primitives/table';

export default defineCapsuleModule({
  name: 'Tables',
  components: {
    DataTable: DataTableController,
    Table,
  },
});
