import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    capsule: 'src/capsule.ts',
  },
  name: 'CapsuleWebMap',
  external: ['maplibre-gl', /^maplibre-gl\//],
});
