import { resolve } from 'node:path';
import { DocsExtractPlugin } from '@capsuletech/docs-builder';
import { libConfig } from '@capsuletech/lib-builder';

const REPO_ROOT = resolve(__dirname, '../../..');
const DOCS_ROOT = resolve(REPO_ROOT, 'docs');

export default libConfig({
  entry: 'src/index.ts',
  name: 'CapsuleWebDocs',
  plugins: [
    DocsExtractPlugin({
      slugStrategyOverride: 'docs',
      rootOverride: DOCS_ROOT,
    }),
  ],
});
