import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    capsule: 'src/capsule.ts',
    dataTable: 'src/composites/dataTable/index.ts',
    table: 'src/primitives/table/index.ts',
    lib: 'src/lib/index.ts',
  },
  name: 'CapsuleTable',
});
