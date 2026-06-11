#!/usr/bin/env node
/**
 * build-manifest.ts
 *
 * Generates dist/manifest.json — a build-time artifact describing the real
 * bundle cost (gzip kB) and external dependency graph per @capsuletech/web-ui
 * subpath.
 *
 * Run via: pnpm --filter @capsuletech/web-ui build:manifest
 * (hook in package.json script; should run AFTER `build`)
 *
 * Schema: src/manifest/types.ts → IWebUiManifest / IPrimitiveManifestEntry
 * Canon:  docs/_meta/web-ui.md section "Weight gradient & size manifest"
 */

import { createRequire } from 'node:module';
import { createGzip } from 'node:zlib';
import { Writable } from 'node:stream';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const distDir = resolve(packageRoot, 'dist');
const componentsDir = resolve(distDir, 'components');

// ---------------------------------------------------------------------------
// Load package.json for version + subpath list
// ---------------------------------------------------------------------------

const pkgPath = resolve(packageRoot, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
  version: string;
  exports: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Weight classification per subpath name — canonical L0/L1 assignment.
// This mirrors the seed list in docs/_meta/web-ui.md.
// If adding a new subpath, add it here too.
// ---------------------------------------------------------------------------

const WEIGHT_MAP: Record<string, 'L0' | 'L1'> = {
  // L0 — presentational + native controls
  typography: 'L0',
  card: 'L0',
  flex: 'L0',
  grid: 'L0',
  layout: 'L0',
  list: 'L0',
  group: 'L0',
  field: 'L0',
  'widget-frame': 'L0',
  widgetFrame: 'L0',
  separator: 'L0',
  skeleton: 'L0',
  spinner: 'L0',
  slot: 'L0',
  label: 'L0',
  button: 'L0',
  input: 'L0',
  textarea: 'L0',
  table: 'L0',
  // L1 — interactive Kobalte / floating / focus-trap
  accordion: 'L1',
  dropdown: 'L1',
  dropdownMenu: 'L1',
  select: 'L1',
  slider: 'L1',
  toggle: 'L1',
  tooltip: 'L1',
  // Composites / others — treated as L1 until classified
  dataTable: 'L1',
  previewCard: 'L1',
  compositeProxy: 'L1',
  menu: 'L1',
  wrappers: 'L1',
  icons: 'L1',
};

// ---------------------------------------------------------------------------
// External deps — all peer deps + known singletons.
// These are excluded from the bundle when measuring size.
// ---------------------------------------------------------------------------

// esbuild `external` accepts package names + wildcard patterns like `@scope/*`,
// NOT regex. Earlier version used RegExp instances which silently got converted
// to invalid pattern strings → workspace deps (@capsuletech/*) and Kobalte/
// TanStack subpaths got bundled inline, inflating sizes.
const EXTERNALS = [
  'solid-js',
  'solid-js/*',
  '@capsuletech/*',
  '@kobalte/*',
  '@tanstack/*',
  '@motionone/*',
  '@corvu/*',
  'lucide-solid',
  'class-variance-authority',
  'clsx',
  'tailwind-merge',
  'solid-motionone',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Gzip a string/Buffer and return byte count. */
async function gzipSize(source: string | Uint8Array): Promise<number> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const gz = createGzip({ level: 9 });
    const sink = new Writable({
      write(chunk: Buffer, _enc: string, cb: () => void) {
        size += chunk.length;
        cb();
      },
    });
    gz.on('error', reject);
    sink.on('error', reject);
    sink.on('finish', () => resolve(size));
    gz.pipe(sink);
    gz.write(source);
    gz.end();
  });
}

/**
 * Returns the canonical subpath name from a package.json exports key.
 * e.g. './button' → 'button', '.' → 'index', './widgetFrame' → 'widgetFrame'
 */
function subpathName(key: string): string {
  if (key === '.') return 'index';
  return key.replace(/^\.\//, '');
}

/**
 * Maps a subpath name to the dist component directory name.
 * Accounts for 'widgetFrame' → 'widget-frame' fs alias.
 */
function distComponentName(name: string): string {
  if (name === 'widgetFrame') return 'widget-frame';
  return name;
}

/**
 * Extract unique external import specifiers from an esbuild metafile.
 * We consider an import "external" if it was not resolved from the local fs
 * (esbuild marks them with external: true in the metafile).
 */
function extractExternals(metafile: esbuild.Metafile): string[] {
  const seen = new Set<string>();
  for (const output of Object.values(metafile.outputs)) {
    for (const imp of output.imports) {
      if (imp.external) {
        seen.add(imp.path);
      }
    }
  }
  return [...seen].sort();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!existsSync(distDir)) {
    console.error(
      '[build-manifest] dist/ not found. Run `pnpm --filter @capsuletech/web-ui build` first.',
    );
    process.exit(1);
  }

  const results: Array<{
    name: string;
    weight: 'L0' | 'L1';
    subpath: string;
    sizeKB: number;
    externals: string[];
  }> = [];

  // Iterate all subpath exports (skip '.' barrel and './package.json')
  const exportKeys = Object.keys(pkg.exports).filter(
    (k) => k !== '.' && k !== './package.json' && !k.endsWith('/*'),
  );

  for (const key of exportKeys) {
    const name = subpathName(key);
    const compName = distComponentName(name);
    const entryFile = resolve(componentsDir, compName, 'index.mjs');

    if (!existsSync(entryFile)) {
      console.warn(`[build-manifest] SKIP ${name}: dist entry not found at ${entryFile}`);
      continue;
    }

    let buildResult: esbuild.BuildResult & { metafile: esbuild.Metafile };
    try {
      buildResult = (await esbuild.build({
        entryPoints: [entryFile],
        bundle: true,
        write: false,
        metafile: true,
        minify: false, // measure raw size for consistency; gzip covers real cost
        format: 'esm',
        platform: 'browser',
        external: EXTERNALS,
        // Tell esbuild to resolve relative imports within dist/
        absWorkingDir: distDir,
        logLevel: 'silent',
      })) as esbuild.BuildResult & { metafile: esbuild.Metafile };
    } catch (err) {
      console.warn(`[build-manifest] SKIP ${name}: esbuild error`, err);
      continue;
    }

    // Collect all output text
    const totalBytes = buildResult.outputFiles.reduce((sum, f) => sum + f.text.length, 0);
    const allText = buildResult.outputFiles.map((f) => f.text).join('');
    const gzBytes = await gzipSize(allText);
    const sizeKB = Math.round((gzBytes / 1024) * 100) / 100;

    const externals = extractExternals(buildResult.metafile);
    const weight: 'L0' | 'L1' = WEIGHT_MAP[name] ?? 'L1';
    const subpath = `@capsuletech/web-ui/${name}`;

    results.push({ name, weight, subpath, sizeKB, externals });
    console.log(`  [${weight}] ${name.padEnd(20)} ${sizeKB.toFixed(2)} kB  (${externals.length} externals)`);
  }

  // Sort: L0 first, then L1; alphabetically within each group
  results.sort((a, b) => {
    if (a.weight !== b.weight) return a.weight === 'L0' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const manifest = {
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    primitives: results,
  };

  const outPath = resolve(distDir, 'manifest.json');
  mkdirSync(distDir, { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`\n[build-manifest] Written ${results.length} entries → ${outPath}`);
}

main().catch((err) => {
  console.error('[build-manifest] Fatal error:', err);
  process.exit(1);
});
