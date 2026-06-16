import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    manifests: 'src/manifests/index.ts',
    controllers: 'src/controllers/index.ts',
    capsule: 'src/capsule.ts',
    docs: 'src/docs/index.ts',
    palette: 'src/palette/index.ts',
  },
  name: 'CapsuleWebStudio',
});
