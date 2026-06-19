/**
 * Slug derivation for docs-builder.
 * Canon: docs/_meta/docs-system.md §8.5
 *
 * Three strategies:
 *   docs    — root-relative, strip numeric-prefix from dirs (mirrors extract.mjs filePathToSlug)
 *   package — <pkg-short>/[...path/<unit>]
 *   app     — app/<appName>/[...path/<unit>]
 */

import { relative } from 'node:path';
import type { ISlugStrategy } from './types.js';

/** Strip leading `NN-` numeric prefix from a directory segment only. File basenames keep theirs. */
const stripNumericPrefix = (seg: string): string => seg.replace(/^\d+-/, '');

/**
 * Convert absPath → slug using the `docs` strategy (mirrors extract.mjs filePathToSlug).
 *
 * docs/01-architecture/adr/048-foo.md → architecture/adr/048-foo
 */
const slugDocs = (absPath: string, root: string): string => {
  const rel = relative(root, absPath).replace(/\\/g, '/');
  const noExt = rel.replace(/\.md$/, '');
  const parts = noExt.split('/');
  const fileBase = parts.pop()!;
  const stripped = parts.map(stripNumericPrefix);
  if (stripped.length === 0) {
    return fileBase === 'index' || /^\d+-index$/.test(fileBase) ? 'index' : fileBase;
  }
  return [...stripped, fileBase].join('/');
};

/**
 * Derive the "short" name from a package/app name.
 * `@capsuletech/web-core` → `web-core`
 * `playground` → `playground`
 */
const toShort = (pkgName: string): string => {
  const idx = pkgName.lastIndexOf('/');
  return idx >= 0 ? pkgName.slice(idx + 1) : pkgName;
};

/**
 * Convert absPath → slug using the `package` strategy.
 *
 * Prefix: <pkg-short>
 * - Strip leading `src/` segment if present (path relative to root).
 * - Strip numeric prefix from directory segments.
 * - If basename is `README.md`:
 *   - If parent dir === root → slug = <pkg-short>
 *   - Else → use parent dir name as unit
 * - Else use basename without `.md` as unit.
 */
const slugPackage = (absPath: string, root: string, pkgShort: string): string => {
  const rel = relative(root, absPath).replace(/\\/g, '/');

  // README handling — detect via relative path ending with /README.md or just README.md
  if (rel === 'README.md' || rel.endsWith('/README.md')) {
    if (rel === 'README.md') {
      // root README
      return pkgShort;
    }
    // nested README: use dir path as the unit
    const dirRel = rel.slice(0, -'/README.md'.length); // remove /README.md suffix
    const pathParts = dirRel.split('/');
    // strip leading src/
    if (pathParts[0] === 'src') pathParts.shift();
    const dirParts = pathParts.map(stripNumericPrefix).filter(Boolean);
    if (dirParts.length === 0) return pkgShort;
    return `${pkgShort}/${dirParts.join('/')}`;
  }

  const noExt = rel.replace(/\.md$/, '');
  const parts = noExt.split('/');
  const unit = parts[parts.length - 1];
  const dirs = parts.slice(0, -1);

  // strip leading src/
  if (dirs[0] === 'src') dirs.shift();

  const strippedDirs = dirs.map(stripNumericPrefix).filter(Boolean);

  if (strippedDirs.length === 0) return `${pkgShort}/${unit}`;
  return `${pkgShort}/${strippedDirs.join('/')}/${unit}`;
};

/**
 * Convert absPath → slug using the `app` strategy.
 *
 * Same as `package` but prefix is `app/<appName>`.
 */
const slugApp = (absPath: string, root: string, appName: string): string => {
  const inner = slugPackage(absPath, root, appName);
  // inner already starts with appName, so prefix with `app/`
  return `app/${inner}`;
};

/**
 * Derive a slug from an absolute file path.
 *
 * @param absPath - Absolute path to the markdown file.
 * @param root - Absolute root of the walk (the directory passed to extractDocs).
 * @param strategy - Slug strategy.
 * @param pkgName - Package/app name (required for `package` and `app` strategies).
 */
export const slugFromPath = (
  absPath: string,
  root: string,
  strategy: ISlugStrategy,
  pkgName?: string,
): string => {
  switch (strategy) {
    case 'docs':
      return slugDocs(absPath, root);
    case 'package': {
      const short = pkgName ? toShort(pkgName) : 'pkg';
      return slugPackage(absPath, root, short);
    }
    case 'app': {
      const appName = pkgName ? toShort(pkgName) : 'app';
      return slugApp(absPath, root, appName);
    }
  }
};
