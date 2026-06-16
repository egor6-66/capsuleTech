import { libConfig } from '../lib/src/libConfig';

export default libConfig({
  entry: {
    index: 'src/index.ts',
    bin: 'src/bin.ts',
  },
  name: 'CapsuleDocsBuilder',
  runtime: 'node',
  // Disable DocsExtractPlugin for this package itself to avoid a bootstrap cycle:
  // docs-builder IS the engine — it cannot depend on itself to extract its own docs.
  docs: false,
});
