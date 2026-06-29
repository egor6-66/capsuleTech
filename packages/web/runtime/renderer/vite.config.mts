import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    // capsule — ADR 033 registration manifest. Registers Renderer.View global.
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleRenderer',
});
