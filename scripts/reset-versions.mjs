#!/usr/bin/env node
/**
 * reset-versions — сбрасывает version во всех @capsule/* пакетах на чистую
 * семантику (без `-dev.<ts>` suffix'а). Использовать, если предыдущий
 * publish:local упал и оставил мусор в исходниках.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const roots = [join(repoRoot, 'packages'), join(repoRoot, 'packages', 'system')];
const paths = [];
for (const dir of roots) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    continue;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'system') continue;
    const p = join(dir, entry.name, 'package.json');
    try {
      if (statSync(p).isFile()) paths.push(p);
    } catch {}
  }
}

let changed = 0;
for (const p of paths) {
  const raw = readFileSync(p, 'utf8');
  const pkg = JSON.parse(raw);
  if (typeof pkg.version !== 'string') continue;
  const clean = pkg.version.replace(/-dev\.\d+$/, '');
  if (clean === pkg.version) continue;
  pkg.version = clean;
  writeFileSync(p, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`reset: ${pkg.name} → ${clean}`);
  changed++;
}
console.log(`Готово. Сброшено ${changed} файлов.`);
