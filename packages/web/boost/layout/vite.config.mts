import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    controllers: 'src/controllers/index.ts',
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleBoostLayout',
});
