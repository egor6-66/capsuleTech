#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
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
  return { meta, fmEnd: end };
};

const files = await walkMd(DOCS_DIR);
console.log('— Missing status —');
for (const f of files) {
  const src = await readFile(f, 'utf8');
  const r = parseFm(src);
  if (!r) continue;
  if (!r.meta.status) {
    console.log(`  ${relative(ROOT, f).replace(/\\/g, '/')}`);
    console.log(`    keys: [${Object.keys(r.meta).join(', ')}]`);
  }
}
console.log('\n— Missing tags —');
for (const f of files) {
  const src = await readFile(f, 'utf8');
  const r = parseFm(src);
  if (!r) continue;
  if (r.meta.tags === undefined) {
    console.log(`  ${relative(ROOT, f).replace(/\\/g, '/')}`);
    console.log(`    keys: [${Object.keys(r.meta).join(', ')}]`);
  }
}
