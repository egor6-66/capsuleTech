import { resolve } from 'node:path';
import { DocsExtractPlugin } from '@capsuletech/docs-builder';
import { libConfig } from '@capsuletech/lib-builder';

// The package root is packages/docs/.
// The docs source lives at the repo root docs/ directory (two levels up).
const REPO_ROOT = resolve(__dirname, '../..');
const DOCS_ROOT = resolve(REPO_ROOT, 'docs');

export default libConfig({
  entry: 'src/index.ts',
  name: 'CapsuleDocs',
  runtime: 'node',
  // Disable DTS — this package is type-stubs only, docs.json is the artifact.
  dts: true,
  // Disable package.json emit — we manage it manually (has docs.json subpath).
  emitPackageJson: false,
  // ADR 052 D2 — explicit opt-in to DocsExtractPlugin.
  // lib-builder is zero-deps; docs-builder ships the plugin, consumers attach it.
  plugins: [
    DocsExtractPlugin({
      slugStrategyOverride: 'docs',
      rootOverride: DOCS_ROOT,
    }),
  ],
});
