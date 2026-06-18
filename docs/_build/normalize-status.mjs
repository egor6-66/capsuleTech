#!/usr/bin/env node
/**
 * docs E3 — Status enum normalization (canon §2.1)
 *
 * Walks all docs/**​/*.md, rewrites frontmatter `status:` field per STATUS_MAP.
 *
 * Idempotent: docs already on canon enum are skipped.
 *
 * Canon enum: proposed | canon | documented | deprecated | superseded
 *
 * Mapping rationale (user-approved 2026-06-13):
 *   accepted (23 docs)         → canon       — ADR accepted = canonical decision
 *   implemented (10)           → canon       — ADR closed via implementation
 *   ready-for-agents (1)       → canon       — Agent-ready = canonical instruction
 *   ready-to-dispatch (2)      → canon       — Ready for owner-* = canonical brief
 *   index (6)                  → documented  — Index/navigation pages — reference
 *   living (5)                 → documented  — Working live reference
 *   living-doc (1)             → documented  — Same as living
 *   snapshot (2)               → documented  — Historical reference (kept for record)
 *   live (1)                   → documented  — Same as living
 *   ready (4 — all briefs)     → documented  — Brief becomes reference after dispatch
 *   planned (1)                → proposed    — Forthcoming decision
 *   draft-for-review (1)       → proposed    — Pre-decision
 *
 * Usage: node docs/_build/normalize-status.mjs [--dry-run]
 */

import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DOCS_DIR = join(ROOT, 'docs');
const DRY_RUN = process.argv.includes('--dry-run');

const STATUS_MAP = new Map([
  ['accepted', 'canon'],
  ['implemented', 'canon'],
  ['ready-for-agents', 'canon'],
  ['ready-to-dispatch', 'canon'],
  ['index', 'documented'],
  ['living', 'documented'],
  ['living-doc', 'documented'],
  ['snapshot', 'documented'],
  ['live', 'documented'],
  ['ready', 'documented'],
  ['planned', 'proposed'],
  ['draft-for-review', 'proposed'],
]);

// Files to delete per E3 review (transient work, author-intent-to-delete satisfied).
const DELETE_FILES = [
  'docs/_meta/_tmp/routing-anim-findings.md',
  'docs/_meta/finish-review-notes.md',
];

const stats = { scanned: 0, rewritten: 0, skipped: 0, deleted: 0, errors: [] };

const walkMd = async (dir, out = []) => {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '.generated' || e.name === '_build' || e.name.startsWith('.')) continue;
      await walkMd(p, out);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
};

/** Rewrite a `status: <old>` line within the frontmatter block to `status: <new>`. */
const rewriteStatus = (src, mapping) => {
  if (!src.startsWith('---\n') && !src.startsWith('---\r\n')) return null;
  const eolMatch = src.match(/\r?\n/);
  const eol = eolMatch ? eolMatch[0] : '\n';
  const lines = src.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      fmEnd = i;
      break;
    }
  }
  if (fmEnd === -1) return null;

  let currentStatus = null;
  let statusLine = -1;
  for (let i = 1; i < fmEnd; i++) {
    const m = lines[i].match(/^status:\s*['"]?([^'"\s#]+)['"]?\s*$/);
    if (m) {
      currentStatus = m[1];
      statusLine = i;
      break;
    }
  }
  if (currentStatus === null) return { changed: false, reason: 'no-status-field' };
  const newStatus = mapping.get(currentStatus);
  if (!newStatus) return { changed: false, reason: 'not-in-map', current: currentStatus };

  lines[statusLine] = `status: ${newStatus}`;
  return { changed: true, current: currentStatus, next: newStatus, output: lines.join(eol) };
};

const main = async () => {
  // Phase 1 — status rewrites
  const files = await walkMd(DOCS_DIR);
  files.sort();
  for (const f of files) {
    stats.scanned++;
    let src;
    try {
      src = await readFile(f, 'utf8');
    } catch (e) {
      stats.errors.push(`${f}: read failed — ${e.message}`);
      continue;
    }
    const result = rewriteStatus(src, STATUS_MAP);
    if (!result || !result.changed) {
      stats.skipped++;
      continue;
    }
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    console.log(`  ${rel}: ${result.current} → ${result.next}`);
    if (!DRY_RUN) {
      await writeFile(f, result.output, 'utf8');
    }
    stats.rewritten++;
  }

  // Phase 2 — deletions
  for (const rel of DELETE_FILES) {
    const abs = join(ROOT, rel);
    try {
      if (!DRY_RUN) await unlink(abs);
      console.log(`  DELETED: ${rel}`);
      stats.deleted++;
    } catch (e) {
      if (e.code !== 'ENOENT') stats.errors.push(`${rel}: delete failed — ${e.message}`);
      else console.log(`  (already gone: ${rel})`);
    }
  }

  console.log(`\nnormalize-status: ${stats.scanned} docs scanned`);
  console.log(`normalize-status: ${stats.rewritten} status rewrites${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`normalize-status: ${stats.deleted} files deleted${DRY_RUN ? ' (dry-run)' : ''}`);
  if (stats.errors.length > 0) {
    console.error(`normalize-status: ${stats.errors.length} ERRORS`);
    for (const e of stats.errors) console.error(`  ✖ ${e}`);
    process.exit(1);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
