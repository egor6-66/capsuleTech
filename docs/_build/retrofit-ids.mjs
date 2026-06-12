#!/usr/bin/env node
/**
 * docs E2.1 — Section-ID inventory pass (H2 reserved IDs in ADRs)
 *
 * Reads all docs/01-architecture/adr/*.md, retrofits {#id} postfix on H2
 * headings that match reserved-ID patterns (canon §1.4).
 *
 * H3-level retrofit (D-decisions etc.) — separate pass.
 * Non-ADR docs (_meta canon, 09-packages guides) — separate pass.
 *
 * Idempotent: headings that already have {#id} are skipped.
 *
 * Usage: node docs/_build/retrofit-ids.mjs [--dry-run]
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ADR_DIR = join(ROOT, 'docs/01-architecture/adr');
const DRY_RUN = process.argv.includes('--dry-run');

// H2-heading text (trimmed) → reserved {#id}.
// Russian + English variants both map to canonical IDs per canon §1.4.
const H2_RESERVED = new Map([
  ['Контекст', 'context'],
  ['Проблема', 'problem'],          // separate from context when both present
  ['Среда / ограничения', 'constraints'],
  ['Решение', 'decisions'],
  ['Решения', 'decisions'],
  ['Decisions', 'decisions'],
  ['Последствия', 'consequences'],
  ['Альтернативы', 'alternatives'],
  ['Альтернативы (отклонены)', 'alternatives'],
  ['Альтернативы (rejected)', 'alternatives'],
  ['Альтернативы, которые мы НЕ взяли', 'alternatives'],
  ['Связанное', 'related'],
  ['Связано', 'related'],
  ['Ссылки', 'related'],
  ['Roll-out', 'rollout'],
  ['Open questions', 'open-questions'],
  ['Открытые вопросы', 'open-questions'],
]);

// Non-goals — separate canon id (not in reserved list yet, but consistent across ADRs).
const NON_GOALS_RX = /^Что (НЕ|не) решает /;

// H3 patterns — extract `D<N>` decisions and `Pain <N>` items.
const H3_DECISION_RX = /^D(\d+)\s*[—-]\s+/;       // "D1 — Boost namespace"
const H3_PAIN_RX = /^Pain\s+(\d+)\s*[—-]\s+/;     // "Pain 3 — Wikilinks не валидируются"

const stats = { files: 0, retrofittedH2: 0, retrofittedH3: 0, skipped: 0, collisions: [] };

const processAdr = async (file) => {
  const src = await readFile(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const usedIds = new Set();
  let inFence = false;
  let fenceMarker = null;
  let changed = false;
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // skip fenced blocks
    const fenceMatch = line.match(/^(\s{0,3})(```+|~~~+)/);
    if (fenceMatch) {
      const m = fenceMatch[2][0];
      if (!inFence) { inFence = true; fenceMarker = m; }
      else if (fenceMarker === m) { inFence = false; fenceMarker = null; }
      out.push(line);
      continue;
    }
    if (inFence) { out.push(line); continue; }

    // H2
    const h2 = line.match(/^## (.+?)\s*$/);
    if (h2) {
      const text = h2[1].trim();
      const existingId = text.match(/\{#([A-Za-z0-9_-]+)\}\s*$/);
      if (existingId) {
        usedIds.add(existingId[1]);
        stats.skipped++;
        out.push(line);
        continue;
      }
      let id = null;
      if (H2_RESERVED.has(text)) id = H2_RESERVED.get(text);
      else if (NON_GOALS_RX.test(text)) id = 'non-goals';
      if (!id) { out.push(line); continue; }
      if (usedIds.has(id)) {
        stats.collisions.push(`${file}: H2 would re-use id "${id}" for "${text}"`);
        out.push(line);
        continue;
      }
      usedIds.add(id);
      out.push(`## ${text} {#${id}}`);
      stats.retrofittedH2++;
      changed = true;
      continue;
    }

    // H3 — D<N> decisions + Pain <N> items
    const h3 = line.match(/^### (.+?)\s*$/);
    if (h3) {
      const text = h3[1].trim();
      const existingId = text.match(/\{#([A-Za-z0-9_-]+)\}\s*$/);
      if (existingId) {
        usedIds.add(existingId[1]);
        stats.skipped++;
        out.push(line);
        continue;
      }
      let id = null;
      const dMatch = text.match(H3_DECISION_RX);
      const painMatch = text.match(H3_PAIN_RX);
      if (dMatch) id = `D${dMatch[1]}`;
      else if (painMatch) id = `pain${painMatch[1]}`;
      if (!id) { out.push(line); continue; }
      if (usedIds.has(id)) {
        stats.collisions.push(`${file}: H3 would re-use id "${id}" for "${text}"`);
        out.push(line);
        continue;
      }
      usedIds.add(id);
      out.push(`### ${text} {#${id}}`);
      stats.retrofittedH3++;
      changed = true;
      continue;
    }

    // record explicit ids from other headings (H4+) to detect collisions
    const anyHeading = line.match(/^#{1,6}\s+(.+?)\s*\{#([A-Za-z0-9_-]+)\}\s*$/);
    if (anyHeading) usedIds.add(anyHeading[2]);
    out.push(line);
  }

  if (changed) {
    if (!DRY_RUN) await writeFile(file, out.join('\n'), 'utf8');
  }
  stats.files++;
  return changed;
};

const main = async () => {
  const entries = await readdir(ADR_DIR);
  const adrs = entries.filter((f) => f.endsWith('.md')).sort().map((f) => join(ADR_DIR, f));
  const changedFiles = [];
  for (const f of adrs) {
    const changed = await processAdr(f);
    if (changed) changedFiles.push(f.replace(ROOT + '/', '').replace(/\\/g, '/'));
  }
  console.log(`retrofit-ids: ${stats.files} ADRs scanned`);
  console.log(`retrofit-ids: ${stats.retrofittedH2} H2 + ${stats.retrofittedH3} H3 headings retrofitted`);
  console.log(`retrofit-ids: ${stats.skipped} skipped (already have {#id})`);
  if (stats.collisions.length > 0) {
    console.log(`retrofit-ids: ${stats.collisions.length} collisions (skipped, manual review needed):`);
    for (const c of stats.collisions) console.log(`  ⚠ ${c}`);
  }
  console.log(`retrofit-ids: ${changedFiles.length} files changed${DRY_RUN ? ' (dry-run, not written)' : ''}`);
};

main().catch((e) => { console.error(e); process.exit(1); });
