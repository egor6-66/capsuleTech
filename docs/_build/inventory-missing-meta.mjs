#!/usr/bin/env node
/**
 * Inventory pass — report docs missing required frontmatter fields.
 * Read-only; used to size backfill effort + pick sensible defaults.
 *
 * Usage: node docs/_build/inventory-missing-meta.mjs
 */
import { readdir, readFile, stat } from 'node:fs/promises';
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

const parseFm = (src) => {
  const lines = src.split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end < 0) return null;
  const meta = {};
  for (const ln of lines.slice(1, end)) {
    const m = ln.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
};

const files = await walkMd(DOCS_DIR);
const groups = {};
const noFm = [];
const noStatus = [];
const noLastUpdated = [];
const noTags = [];
const hasAll = [];

for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const top = rel.split('/').slice(0, 2).join('/');
  groups[top] = (groups[top] || 0) + 1;
  const src = await readFile(f, 'utf8');
  const meta = parseFm(src);
  if (!meta) {
    noFm.push(rel);
    continue;
  }
  const hasStatus = meta.status && meta.status !== '';
  const hasLu =
    (meta.last_updated && meta.last_updated !== '') ||
    (meta['last-updated'] && meta['last-updated'] !== '');
  const hasTags = meta.tags !== undefined && meta.tags !== '';
  if (!hasStatus) noStatus.push(rel);
  if (!hasLu) noLastUpdated.push(rel);
  if (!hasTags) noTags.push(rel);
  if (hasStatus && hasLu && hasTags) hasAll.push(rel);
}

console.log(`Total docs: ${files.length}`);
console.log(`No frontmatter: ${noFm.length}`);
console.log(`Missing status: ${noStatus.length}`);
console.log(`Missing last_updated: ${noLastUpdated.length}`);
console.log(`Missing tags: ${noTags.length}`);
console.log(`Fully populated: ${hasAll.length}`);

console.log('\n— Top-level group distribution —');
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(40)} ${v}`);
}

const groupByTop = (list) => {
  const g = {};
  for (const f of list) {
    const top = f.split('/').slice(0, 2).join('/');
    g[top] = (g[top] || 0) + 1;
  }
  return g;
};

console.log('\n— Missing status by group —');
for (const [k, v] of Object.entries(groupByTop(noStatus)).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(40)} ${v}`);
}

console.log('\n— Missing last_updated by group —');
for (const [k, v] of Object.entries(groupByTop(noLastUpdated)).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(40)} ${v}`);
}

console.log('\n— Missing tags by group —');
for (const [k, v] of Object.entries(groupByTop(noTags)).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(40)} ${v}`);
}

if (noFm.length > 0) {
  console.log('\n— No frontmatter at all —');
  for (const f of noFm.slice(0, 30)) console.log(`  ${f}`);
  if (noFm.length > 30) console.log(`  ... and ${noFm.length - 30} more`);
}
