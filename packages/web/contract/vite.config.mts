import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    'capabilities/index': 'src/capabilities/index.ts',
  },
  name: 'CapsuleContract',
});
