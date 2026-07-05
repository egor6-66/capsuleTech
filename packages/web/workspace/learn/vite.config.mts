import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    lessons: 'src/modules/lessons/index.ts',
    exercise: 'src/modules/exercise/index.ts',
    progress: 'src/modules/progress/index.ts',
    library: 'src/modules/library/index.ts',
    guides: 'src/modules/guides/index.ts',
    'sentence-builder': 'src/modules/sentence-builder/index.ts',
    welcome: 'src/modules/welcome/index.ts',
    controllers: 'src/core/controllers/index.ts',
    capsule: 'src/capsule.tsx',
  },
  name: 'CapsuleWebLearn',
});
