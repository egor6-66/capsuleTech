#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
/**
 * Frontmatter backfill (ADR 048 E2 cleanup).
 *
 * Adds `last_updated` (from git log) to docs that have a frontmatter block but
 * are missing the field. Skips:
 *   - docs with no frontmatter at all (product decision pending)
 *   - docs that already have `last_updated` or legacy `last-updated`
 *
 * Idempotent. Run from repo root: `node docs/_build/backfill-frontmatter.mjs`
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS_DIR = join(ROOT, 'docs');

const walkMd = async (dir, out = []) => {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '.generated' || e.name === '_build' || e.name.startsWith('.')) continue;
      await walkMd(p, out);
    } else if (e.isFile() && e.name.endsWith('.md')) out.push(p);
  }
  return out;
};

const TODAY = new Date().toISOString().slice(0, 10);

/** Last-commit date for the file in YYYY-MM-DD. Falls back to today if untracked. */
const gitLastDate = (absPath) => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', absPath], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    return out || TODAY;
  } catch {
    return TODAY;
  }
};

/** Parse simple key:value frontmatter; preserves the original block as a string list. */
const splitFrontmatter = (src) => {
  const lines = src.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 0) return null;
  return {
    fmLines: lines.slice(1, end),
    bodyLines: lines.slice(end + 1),
    eol: src.includes('\r\n') ? '\r\n' : '\n',
  };
};

const hasField = (fmLines, key) => fmLines.some((ln) => new RegExp(`^${key}\\s*:`).test(ln));

const stats = { scanned: 0, backfilled: 0, skippedNoFm: 0, skippedHasField: 0 };

const files = await walkMd(DOCS_DIR);
for (const abs of files) {
  stats.scanned++;
  const src = await readFile(abs, 'utf8');
  const parts = splitFrontmatter(src);
  if (!parts) {
    stats.skippedNoFm++;
    continue;
  }
  const { fmLines, bodyLines, eol } = parts;
  if (hasField(fmLines, 'last_updated') || hasField(fmLines, 'last-updated')) {
    stats.skippedHasField++;
    continue;
  }
  const date = gitLastDate(abs);
  // append at end of frontmatter block — preserves existing ordering
  const newFm = [...fmLines, `last_updated: ${date}`];
  const out = ['---', ...newFm, '---', ...bodyLines].join(eol);
  await writeFile(abs, out, 'utf8');
  stats.backfilled++;
  console.log(`  + ${relative(ROOT, abs).replace(/\\/g, '/')}  ${date}`);
}

console.log('');
console.log(`Scanned:           ${stats.scanned}`);
console.log(`Backfilled:        ${stats.backfilled}`);
console.log(`Skipped (no FM):   ${stats.skippedNoFm}`);
console.log(`Skipped (had it):  ${stats.skippedHasField}`);
