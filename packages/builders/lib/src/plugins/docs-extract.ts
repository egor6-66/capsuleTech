/**
 * DocsExtractPlugin — Vite plugin that emits dist/docs.json at build time.
 *
 * Canon: docs/_meta/docs-system.md §8.3 (Producer lifecycle).
 * ADR 052 D2 — auto-plugged into lib-builder pipeline.
 *
 * Reads <packageRoot>/package.json to derive pkgName automatically.
 * Calls extractDocs() from @capsuletech/docs-builder.
 * Writes dist/docs.json via Node fs (reliable for SSR/node build mode).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

export type IDocsSlugStrategy = 'package' | 'app' | 'docs';

export interface IDocsExtractPluginOptions {
  /**
   * Disable the plugin entirely. Default: true (enabled).
   * Set to false in libConfig({ docs: false }) to skip docs extraction.
   */
  enabled?: boolean;

  /**
   * Extra glob / file-name patterns to exclude, in addition to defaults
   * (OWNERSHIP.md, CHANGELOG.md, dist/, node_modules/, etc.).
   */
  exclude?: string[];

  /**
   * Override slug strategy. Defaults to 'package' for lib-builder context.
   * 'docs' is used by @capsuletech/docs root package.
   */
  slugStrategyOverride?: IDocsSlugStrategy;

  /**
   * Override the root directory to scan for .md files.
   * Default: package root (cwd at build time, i.e. resolve('.') from Vite).
   * Set to an absolute path to scan a different directory (e.g. root docs/).
   */
  rootOverride?: string;
}

/**
 * Read package name from package.json in the given root.
 * Falls back to the directory name if no name field.
 */
const readPkgName = (root: string): string => {
  const pkgPath = resolve(root, 'package.json');
  if (!existsSync(pkgPath)) return root.split(/[\\/]/).pop() ?? 'unknown';
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
    return pkg.name ?? root.split(/[\\/]/).pop() ?? 'unknown';
  } catch {
    return root.split(/[\\/]/).pop() ?? 'unknown';
  }
};

export const DocsExtractPlugin = (opts: IDocsExtractPluginOptions = {}): Plugin => {
  const enabled = opts.enabled ?? true;

  return {
    name: 'capsule:docs-extract',
    apply: 'build',

    async closeBundle() {
      if (!enabled) return;

      // Dynamic import: docs-builder is a peer workspace dep, not bundled.
      // Using dynamic import avoids circular-dep issues and keeps lib-builder
      // zero-deps at static-analysis time.
      let extractDocs: typeof import('@capsuletech/docs-builder').extractDocs;
      try {
        const mod = await import('@capsuletech/docs-builder');
        extractDocs = mod.extractDocs;
      } catch (err) {
        this.warn(
          `[capsule:docs-extract] @capsuletech/docs-builder not available — skipping docs extraction. ${String(err)}`,
        );
        return;
      }

      // Resolve package root: Vite sets cwd to the package directory on build.
      const pkgRoot = opts.rootOverride ?? resolve('.');
      const pkgName = readPkgName(resolve('.'));
      const strategy = opts.slugStrategyOverride ?? 'package';

      const result = await extractDocs({
        root: pkgRoot,
        strategy,
        pkgName,
        extraExcludeFiles: opts.exclude,
      });

      // Log warnings from extraction
      for (const w of result.warnings) {
        this.warn(`[capsule:docs-extract] ${w}`);
      }
      // Log errors but do not fail build (per canon §8.9 — legacy doesn't break build)
      for (const e of result.errors) {
        this.warn(`[capsule:docs-extract] ERROR: ${e}`);
      }

      // Write dist/docs.json
      const outDir = resolve('dist');
      mkdirSync(outDir, { recursive: true });
      const outPath = resolve(outDir, 'docs.json');
      writeFileSync(outPath, JSON.stringify(result.registry, null, 2) + '\n', 'utf8');
      // biome-ignore lint/suspicious/noConsole: intentional build-log
      console.log(
        `[capsule:docs-extract] dist/docs.json emitted (${Object.keys(result.registry).length} docs, ${result.warnings.length} warnings)`,
      );
    },
  };
};
