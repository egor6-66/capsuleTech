import { libConfig } from '@capsuletech/lib-builder';

// SKELETON: одна entry. Owner-web-creator добавляет subpath-entry по мере
// наполнения (/shell /palette /tree /inspector /canvas /data /monitor /catalog
// /style /ui /text /logic /app) — см. docs/playground/architecture.md.
export default libConfig({
  entry: {
    index: 'src/index.ts',
  },
  name: 'CapsuleCreator',
});
