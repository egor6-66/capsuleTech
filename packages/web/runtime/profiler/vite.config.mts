import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    providers: 'src/providers/index.ts',
    widget: 'src/widget/index.ts',
    core: 'src/core/index.ts',
    collectors: 'src/collectors/index.ts',
    reporters: 'src/reporters/index.ts',
    api: 'src/api/index.ts',
    trace: 'src/trace/index.ts',
  },
  name: 'CapsuleProfiler',
});
