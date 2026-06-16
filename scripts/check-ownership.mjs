#!/usr/bin/env node
// check-ownership.mjs — гейт OWNERSHIP-канона (срез C плана «рабочая база»).
//
// Делает канон ИСПОЛНЯЕМЫМ: каждый пакет в packages/** обязан иметь OWNERSHIP.md
// по структуре docs/_meta/OWNERSHIP-template.md (frontmatter + ключевые секции).
// Дополняет governance-хук (хук = «прочитай перед правкой», гейт = «существует
// + правильной формы»).
//
//   node scripts/check-ownership.mjs            # warn-режим: репорт, exit 0
//   node scripts/check-ownership.mjs --strict   # CI-режим: exit 1 при нарушениях
//
// Источник истины структуры — docs/_meta/OWNERSHIP-template.md.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = join(ROOT, 'packages');

// Пакеты, временно освобождённые от гейта (с причиной). Сужать по мере чистки.
const EXEMPT = new Map([
  ['@capsuletech/biome-config', 'config-only (нет src/, нечего документировать)'],
]);

const REQUIRED_FRONTMATTER = ['name', 'owner-agent', 'group', 'status', 'last-updated'];
const REQUIRED_SECTIONS = ['Зона ответственности', 'Публичный API', 'Quirks', 'Test coverage'];

/** Рекурсивно найти корни пакетов (dir с package.json + name @capsuletech/*). */
function findPackages(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const pj = join(full, 'package.json');
    if (existsSync(pj)) {
      let name = '';
      try {
        name = JSON.parse(readFileSync(pj, 'utf8')).name ?? '';
      } catch {
        /* skip */
      }
      if (name.startsWith('@capsuletech/')) {
        acc.push({ name, dir: full });
        continue; // не спускаемся внутрь пакета
      }
    }
    findPackages(full, acc); // группа-дир (web/builders/shared) — спускаемся
  }
  return acc;
}

/** Проверить один OWNERSHIP.md → массив проблем (пусто = ок). */
function checkOwnership(pkgDir) {
  const path = join(pkgDir, 'OWNERSHIP.md');
  if (!existsSync(path)) return ['нет OWNERSHIP.md'];

  const text = readFileSync(path, 'utf8');
  const problems = [];

  // frontmatter
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) {
    problems.push('нет YAML-frontmatter');
  } else {
    for (const key of REQUIRED_FRONTMATTER) {
      if (!new RegExp(`^${key}\\s*:`, 'm').test(fm[1])) problems.push(`frontmatter: нет "${key}"`);
    }
  }

  // секции (по заголовкам ## …)
  for (const section of REQUIRED_SECTIONS) {
    if (!new RegExp(`^#{1,3}\\s+.*${section}`, 'mi').test(text)) {
      problems.push(`нет секции "${section}"`);
    }
  }
  return problems;
}

const strict = process.argv.includes('--strict');
const packages = findPackages(PACKAGES).sort((a, b) => a.name.localeCompare(b.name));

let ok = 0;
const violations = [];
for (const pkg of packages) {
  if (EXEMPT.has(pkg.name)) continue;
  const problems = checkOwnership(pkg.dir);
  if (problems.length === 0) ok++;
  else violations.push({ name: pkg.name, problems });
}

const checked =
  packages.length - [...EXEMPT.keys()].filter((n) => packages.some((p) => p.name === n)).length;
console.log(`\nOWNERSHIP gate — ${ok}/${checked} пакетов соответствуют канону.\n`);

if (violations.length) {
  for (const v of violations) {
    console.log(`  ✗ ${v.name}`);
    for (const p of v.problems) console.log(`      · ${p}`);
  }
  console.log(`\n${violations.length} нарушений. Канон: docs/_meta/OWNERSHIP-template.md`);
  if (EXEMPT.size) {
    console.log(
      `\n  (освобождены: ${[...EXEMPT.entries()].map(([n, r]) => `${n} — ${r}`).join('; ')})`,
    );
  }
  process.exit(strict ? 1 : 0);
}

console.log('Все пакеты соответствуют канону OWNERSHIP. ✓');
if (EXEMPT.size) {
  console.log(`  (освобождены: ${[...EXEMPT.keys()].join(', ')})`);
}
