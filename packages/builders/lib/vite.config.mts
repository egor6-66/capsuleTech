import { libConfig } from './src/libConfig';

export default libConfig({
  entry: 'src/index.ts',
  name: 'CapsuleLibConfig',
  runtime: 'node',
  // DocsExtractPlugin is defined here in lib-builder itself — disabling it prevents
  // the plugin from trying to dynamically import @capsuletech/docs-builder during
  // its own build (bootstrap cycle: lib-builder build → docs-extract → docs-builder
  // which in turn requires lib-builder to exist). Docs for lib-builder can be extracted
  // by an external caller once both packages are built.
  docs: false,
});
