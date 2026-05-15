import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { libConfig } from '@capsule/shared-vite';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    editor: 'src/editor/index.ts',
  },
  name: 'CapsuleStyle',
  plugins: [
    {
      name: 'copy-css',
      closeBundle() {
        copyFileSync(resolve('src/index.css'), resolve('dist/index.css'));
      },
    },
  ],
});
