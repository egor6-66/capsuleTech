import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    capsule: 'capsule.ts',
  },
  name: 'CapsuleTable',
});
