import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    capsule: 'src/capsule.ts',
    controllers: 'src/controllers/index.ts',
    core: 'src/core/index.ts',
    dropdown: 'src/dropdown/index.ts',
  },
  name: 'CapsuleMenu',
});
