import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    manifests: 'src/shared/manifests/index.ts',
    capsule: 'src/capsule.ts',
    palette: 'src/modules/palette/index.ts',
  },
  name: 'CapsuleWebStudio',
});
