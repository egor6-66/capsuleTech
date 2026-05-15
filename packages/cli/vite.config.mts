import * as path from 'node:path';
import { libConfig, plugins } from '@capsule/shared-vite';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    'bin/capsule': 'bin/capsule.mjs',
  },
  name: 'CapsuleCli',
  runtime: 'node',
  plugins: [
    plugins.staticCopyPlugin([
      {
        src: path.resolve(__dirname, 'src/templates'),
        dest: path.resolve(__dirname, 'dist/templates'),
      },
    ]),
  ],
});
