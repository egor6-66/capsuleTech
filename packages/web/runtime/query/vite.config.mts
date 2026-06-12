import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    stream: 'src/stream/index.ts',
  },
  name: 'CapsuleQuery',
});
