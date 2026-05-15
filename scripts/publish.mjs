#!/usr/bin/env node
/**
 * publish-local — собирает все @capsule/* пакеты (если ещё не собраны) и
 * публикует их в локальный verdaccio.
 *
 * Использование:
 * pnpm publish:local
 * pnpm publish:local --filter=@capsule/core     # опубликовать ТОЛЬКО @capsule/core
 * pnpm publish:local --filter=core              # сокращенный вариант без scope
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const REGISTRY = args.get('registry') || 'http://localhost:4873';
const TAG = args.get('tag') || 'dev';
const SHOULD_BUILD = !args.has('no-build');
const SHOULD_CLEAN = !args.has('no-clean');
// Получаем значение фильтра, если он передан
const FILTER = args.get('filter');

const STORAGE_DIR = resolve(repoRoot, 'tmp/local-registry/storage');

const ts = new Date()
  .toISOString()
  .replace(/[-:T.Z]/g, '')
  .slice(0, 14); // YYYYMMDDhhmmss

const findPackages = () => {
  const roots = [join(repoRoot, 'packages'), join(repoRoot, 'packages', 'system')];
  const found = [];

  for (const dir of roots) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'system') continue;
      const pkgPath = join(dir, entry.name, 'package.json');
      try {
        if (statSync(pkgPath).isFile()) found.push(pkgPath.replaceAll('\\', '/'));
      } catch {
        // нет package.json — skip
      }
    }
  }
  return found;
};

const log = (msg) => console.log(`\x1b[36m[publish-local]\x1b[0m ${msg}`);
const warn = (msg) => console.warn(`\x1b[33m[publish-local]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[publish-local]\x1b[0m ${msg}`);
  process.exit(1);
};

const run = (cmd, cwd, opts = {}) => {
  log(`> ${cmd} (cwd: ${cwd})`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: 'inherit', ...opts });
  if (r.status !== 0 && !opts.allowFail) fail(`Команда упала: ${cmd}`);
  return r;
};

const packagePaths = findPackages();
log(`Найдено пакетов всего в монорепозитории: ${packagePaths.length}`);

if (SHOULD_CLEAN) {
  const capsuleStorage = join(STORAGE_DIR, '@capsule');
  try {
    rmSync(capsuleStorage, { recursive: true, force: true });
    // biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
    log(`Очищен scope @capsule в registry storage`);
  } catch (e) {
    warn(`Не удалось очистить ${capsuleStorage}: ${e.message}`);
  }
}

if (SHOULD_BUILD) {
  log('Сборка всех пакетов...');
  run('pnpm -r --filter="./packages/**" build', repoRoot);
} else {
  warn('--no-build: пропускаю сборку, использую существующий dist/');
}

const snapshots = packagePaths.map((path) => {
  const raw = readFileSync(path, 'utf8');
  const pkg = JSON.parse(raw);
  return { path, raw, pkg };
});

// 1. Сначала отбираем в принципе публичные пакеты
let publishable = snapshots.filter((s) => !s.pkg.private && typeof s.pkg.name === 'string');

// ==================== НОВЫЙ БЛОК: ФИЛЬТРАЦИЯ ПАКЕТОВ ====================
if (typeof FILTER === 'string') {
  const targetName = FILTER.startsWith('@capsule/') ? FILTER : `@capsule/${FILTER}`;

  publishable = publishable.filter((s) => s.pkg.name === targetName);

  if (publishable.length === 0) {
    fail(`Фильтр "--filter=${FILTER}" передан, но такой публичный пакет не найден.`);
  }
  log(`Применен фильтр. К публикации остался только: ${publishable[0].pkg.name}`);
} else {
  log(`К публикации: ${publishable.length} (${publishable.map((s) => s.pkg.name).join(', ')})`);
}
// =======================================================================

const newVersions = new Map();
for (const s of publishable) {
  const base = s.pkg.version || '0.0.1';
  const cleanBase = base.replace(/-.*$/, '');
  const next = `${cleanBase}-dev.${ts}`;
  newVersions.set(s.pkg.name, next);
}

const writePkg = (path, pkg) => writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const rewriteWorkspaceDeps = (pkg) => {
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (typeof range === 'string' && range.startsWith('workspace:')) {
        const target = newVersions.get(name);
        if (target) {
          deps[name] = target;
        } else {
          // Если мы публикуем один пакет, его зависимости-соседи не получают новую dev-версию в рамках этого запуска.
          // Чтобы pnpm не упал, подставляем текущую версию соседа из snapshots
          const currentSnapshot = snapshots.find((s) => s.pkg.name === name);
          if (currentSnapshot) {
            deps[name] = currentSnapshot.pkg.version;
          } else {
            warn(`workspace:* без target в registry: ${pkg.name} -> ${name}, оставляю как есть`);
          }
        }
      }
    }
  }
};

for (const s of publishable) {
  s.pkg.version = newVersions.get(s.pkg.name);
  rewriteWorkspaceDeps(s.pkg);
  writePkg(s.path, s.pkg);
}

let failures = 0;
try {
  for (const s of publishable) {
    const dir = dirname(s.path);
    log(`Публикую ${s.pkg.name}@${s.pkg.version}`);
    const r = run(`pnpm publish --no-git-checks --registry=${REGISTRY} --tag=${TAG}`, dir, {
      allowFail: true,
    });
    if (r.status !== 0) {
      failures++;
      warn(`✖ ${s.pkg.name} не опубликовался`);
    }
  }
} finally {
  log('Восстанавливаю исходные package.json...');
  for (const s of snapshots) writeFileSync(s.path, s.raw, 'utf8');
}

if (failures > 0) {
  fail(`Завершено с ошибками: ${failures} пакетов не опубликованы.`);
}

log(`✓ Всё завершено. Опубликовано в ${REGISTRY} с тегом ${TAG}.`);
