import { libConfig } from '@capsuletech/lib-builder';

export default libConfig({
  entry: 'src/index.ts',
  name: 'CapsuleWebMap',
  external: ['maplibre-gl', /^maplibre-gl\//],
});
