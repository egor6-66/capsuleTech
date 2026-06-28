#!/usr/bin/env node
// scope-resolve.mjs — резолв CAPSULE_SCOPE → пакет.
//
// Canon (2026-06-22): scope-name = package.json#name минус `@capsuletech/`
// минус опциональный `web-` префикс. Один источник истины с governance.mjs.
//
//   @capsuletech/web-ui       → scope `ui`
//   @capsuletech/web-remote   → scope `remote`
//   @capsuletech/web-studio   → scope `studio`
//   @capsuletech/vite-builder → scope `vite-builder`
//   @capsuletech/canvas-ui    → scope `canvas-ui`
//   @capsuletech/cli          → scope `cli`
//
// Конфликта `ui` vs `canvas-ui` нет: web-strip даёт `ui`, без web- остаётся
// полное имя пакета. Каждый scope резолвится в один пакет однозначно.
//
// Использование:
//   - как библиотека: `import { resolveScope } from './scope-resolve.mjs'`
//   - как CLI:        `node scope-resolve.mjs <scope>` → exit 0 + JSON, либо exit 1 + stderr

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const norm = (p) => p.replace(/\\/g, '/');

/** Корень репо: observability/.claude/hooks/ → ../../../.. */
export function repoRoot() {
  return resolve(__dirname, '..', '..', '..', '..');
}

/** Канонический scope из package.json#name. */
export function scopeFromName(pkgName) {
  return (pkgName ?? '').replace(/^@[^/]+\//, '').replace(/^web-/, '');
}

/**
 * Рекурсивный обход директории с проектами (packages/ и backend/).
 * Canon: если в директории есть манифест (package.json — TS-пакеты; project.json —
 * backend-проекты Python/Rust без package.json) — это проект, ВНУТРЬ не рекурсим
 * (проекты не вложены друг в друга). Это автоматически отсекает e2e/verdaccio-storage,
 * test-фикстуры, alembic/versions и прочий мусор внутри проектов.
 * Имя берётся из package.json#name (приоритет), иначе project.json#name.
 */
function* walkPackages(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (ent.name.startsWith('.')) continue; // .nx, .turbo, .capsule, etc.
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const sub = join(dir, ent.name);
    const pkgJson = join(sub, 'package.json');
    const projJson = join(sub, 'project.json');
    const manifest = existsSync(pkgJson) ? pkgJson : existsSync(projJson) ? projJson : null;
    if (manifest) {
      try {
        if (statSync(manifest).isFile()) {
          let name = '';
          try {
            name = JSON.parse(readFileSync(manifest, 'utf8')).name ?? '';
          } catch {
            /* битый манифест — пропускаем */
          }
          if (name) {
            yield { path: sub, name, scope: scopeFromName(name) };
          }
          continue; // не рекурсим внутрь найденного проекта
        }
      } catch {
        /* ignore */
      }
    }
    yield* walkPackages(sub);
  }
}

/** Построить index scope-name → проект (packages/ + backend/). */
export function buildIndex(root = repoRoot()) {
  const byScope = new Map();
  for (const baseDir of ['packages', 'backend']) {
    for (const pkg of walkPackages(join(root, baseDir))) {
      if (!byScope.has(pkg.scope)) byScope.set(pkg.scope, pkg);
      // дубль scope — должно быть архитектурно невозможно при canon
      // (манифест#name уникальны в monorepo). Игнорируем второй match.
    }
  }
  return byScope;
}

/**
 * @param {string} scope
 * @param {string} [root]
 * @returns {{ scope: 'main', kind: 'main' } | { scope: string, kind: 'package', packagePath: string, packageName: string, relativePath: string } | null}
 */
export function resolveScope(scope, root = repoRoot()) {
  if (!scope) return null;
  if (scope === 'main') return { scope: 'main', kind: 'main' };

  const index = buildIndex(root);
  const match = index.get(scope);
  if (!match) return null;

  return {
    scope,
    kind: 'package',
    packagePath: match.path,
    packageName: match.name,
    relativePath: norm(relative(root, match.path)),
  };
}

/** Список валидных scope-имён для help-сообщений. */
export function listValidScopes(root = repoRoot()) {
  const index = buildIndex(root);
  return ['main', ...[...index.keys()].sort()];
}

// CLI mode
if (process.argv[1] && norm(process.argv[1]).endsWith('scope-resolve.mjs')) {
  const scope = process.argv[2];
  if (!scope) {
    process.stderr.write('usage: node scope-resolve.mjs <scope>\n');
    process.exit(2);
  }
  const res = resolveScope(scope);
  if (!res) {
    process.stderr.write(`scope-resolve: unknown scope "${scope}". Valid scopes:\n`);
    for (const name of listValidScopes()) {
      process.stderr.write(`  ${name}\n`);
    }
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(res) + '\n');
  process.exit(0);
}
