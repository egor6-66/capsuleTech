import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Inline Vite config for @capsuletech/docs-builder.
 *
 * Why not libConfig() from @capsuletech/lib-builder?
 * lib-builder is a separate package that may consume docs-builder for the
 * DocsExtractPlugin (Phase 4+). Using libConfig here would force lib-builder to
 * be built before docs-builder, while lib-builder transitively needs docs-builder
 * — a bootstrap cycle. Keeping this config self-contained (vite + dts only,
 * zero workspace deps) lets docs-builder build cold on a fresh CI runner.
 */
export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      outDirs: 'dist',
      pathsToAliases: false,
      include: ['src/**/*.ts'],
      tsconfigPath: 'tsconfig.json',
      compilerOptions: { composite: false },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    ssr: true,
    target: 'node18',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        bin: resolve(__dirname, 'src/bin.ts'),
      },
      name: 'CapsuleDocsBuilder',
      formats: ['es'],
    },
    rolldownOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`), 'vite', /^vite\//],
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
