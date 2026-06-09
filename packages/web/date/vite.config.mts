import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    format: 'src/format.ts',
    filters: 'src/filters.ts',
  },
  name: 'CapsuleDate',
  // date-fns is a runtime dependency — resolve it at the consumer, don't inline.
  external: ['date-fns', /^date-fns\//],
});
