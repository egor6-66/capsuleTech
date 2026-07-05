import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    lessons: 'src/lessons/index.ts',
    exercise: 'src/exercise/index.ts',
    progress: 'src/progress/index.ts',
    library: 'src/library/index.ts',
    guides: 'src/guides/index.ts',
    'sentence-builder': 'src/sentence-builder/index.ts',
    welcome: 'src/welcome/index.ts',
    controllers: 'src/controllers/index.ts',
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleWebLearn',
});
