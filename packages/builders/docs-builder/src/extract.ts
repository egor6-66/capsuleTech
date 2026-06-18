/**
 * Main extraction logic for @capsuletech/docs-builder.
 *
 * Walk a directory tree, parse .md files, build typed registry.
 * Canon: docs/_meta/docs-system.md
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { shouldExcludeDir, shouldExcludeFile } from './exclusions.js';
import {
  DEFAULT_AUDIENCE,
  deriveType,
  normalizeAudience,
  parseFrontmatter,
  parseSections,
  validateMeta,
} from './parser.js';
import { slugFromPath } from './slug.js';
import type {
  IDocEntry,
  IDocMeta,
  IDocsRegistry,
  IExtractDocsOptions,
  IExtractDocsResult,
} from './types.js';

// ─── walk ─────────────────────────────────────────────────────────────────────

const walkMd = async (
  dir: string,
  extraExcludeDirs: string[],
  out: string[] = [],
): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (shouldExcludeDir(e.name, extraExcludeDirs)) continue;
      await walkMd(p, extraExcludeDirs, out);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
};

// ─── per-file processing ──────────────────────────────────────────────────────

interface IProcessResult {
  slug: string;
  record: IDocEntry;
  warnings: string[];
  errors: string[];
}

const processFile = async (
  absPath: string,
  root: string,
  opts: IExtractDocsOptions,
): Promise<IProcessResult> => {
  const warnings: string[] = [];
  const errors: string[] = [];

  const src = await readFile(absPath, 'utf8');
  const lines = src.split(/\r?\n/);
  const file = relative(root, absPath).replace(/\\/g, '/');

  const { meta: rawMeta, bodyStartLine, warnings: fmWarnings } = parseFrontmatter(lines, file);
  warnings.push(...fmWarnings);

  const slug = slugFromPath(absPath, root, opts.strategy, opts.pkgName);

  const { warnings: valWarnings, errors: valErrors } = validateMeta(rawMeta, file);
  warnings.push(...valWarnings);
  errors.push(...valErrors);

  const docAudience = normalizeAudience(rawMeta.audience);

  // Build computed meta
  const headings = lines.filter((l) => l.match(/^#\s+(.+)$/));
  const h1Match = lines.find((l) => l.match(/^#\s+(.+?)(\s*\{#[^}]+\})?\s*$/));
  let titleFallback: string | undefined;
  if (h1Match) {
    const m = h1Match.match(/^#\s+(.+?)(\s*\{#[^}]+\})?\s*$/);
    if (m) titleFallback = m[1].trim();
  }

  const meta: IDocMeta = {
    ...rawMeta,
    type: deriveType(slug, rawMeta) as IDocMeta['type'],
    audience: docAudience && docAudience.length > 0 ? docAudience : [...DEFAULT_AUDIENCE],
  };

  if (!meta.title && titleFallback) {
    meta.title = titleFallback;
  }

  const {
    sections,
    warnings: secWarnings,
    errors: secErrors,
    docWikilinks,
  } = parseSections(lines, bodyStartLine, file, docAudience);
  warnings.push(...secWarnings);
  errors.push(...secErrors);

  const record: IDocEntry = {
    meta,
    sections,
    wikilinks: [...new Set(docWikilinks)].sort(),
  };

  return { slug, record, warnings, errors };
};

// ─── wikilink resolution ──────────────────────────────────────────────────────

const resolveWikilinks = (registry: IDocsRegistry): string[] => {
  const warnings: string[] = [];
  const knownSlugs = new Set(Object.keys(registry));

  for (const [slug, rec] of Object.entries(registry)) {
    for (const link of rec.wikilinks) {
      const target = link.split('#')[0];
      const exact = knownSlugs.has(target);
      const suffix = !exact && [...knownSlugs].some((s) => s.endsWith('/' + target));
      if (!exact && !suffix) {
        warnings.push(`${slug}: unresolved wikilink "${link}"`);
      }
    }
  }

  return warnings;
};

// ─── main ─────────────────────────────────────────────────────────────────────

/**
 * Walk `opts.root` recursively, parse all .md files, build typed docs registry.
 *
 * Caller decides what to do with errors (throw / log / ignore).
 */
export const extractDocs = async (opts: IExtractDocsOptions): Promise<IExtractDocsResult> => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const registry: IDocsRegistry = {};

  const extraExcludeDirs = opts.extraExcludeDirs ?? [];
  const extraExcludeFiles = opts.extraExcludeFiles ?? [];

  const files = await walkMd(opts.root, extraExcludeDirs);
  files.sort();

  for (const f of files) {
    // Check file-level exclusions
    if (shouldExcludeFile(f, extraExcludeFiles)) continue;

    const result = await processFile(f, opts.root, opts);
    warnings.push(...result.warnings);
    errors.push(...result.errors);

    if (registry[result.slug]) {
      errors.push(
        `${relative(opts.root, f).replace(/\\/g, '/')}: slug collision: "${result.slug}" already produced by another file`,
      );
      continue;
    }
    registry[result.slug] = result.record;
  }

  // Wikilink resolution pass (warn, not error in v1 per canon §4.2)
  const wikilinkWarnings = resolveWikilinks(registry);
  warnings.push(...wikilinkWarnings);

  return { registry, warnings, errors };
};
