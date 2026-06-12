import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    ui: 'src/ui/index.ts',
    controllers: 'src/controllers/index.ts',
    capsule: 'src/capsule.ts',
    matrix: 'src/matrix/index.ts',
    layout: 'src/layout/index.ts',
    chrome: 'src/chrome/index.ts',
  },
  name: 'CapsuleShell',
});
