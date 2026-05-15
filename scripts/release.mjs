#!/usr/bin/env node
/**
 * release — обёртка над `nx release` для двух сценариев:
 *
 *   1. DEV (по умолчанию) → publish в локальный verdaccio
 *      pnpm release:local                          # bump по conventional-commits с момента tag'а
 *      pnpm release:local -- patch                 # явный patch-бамп
 *      pnpm release:local -- minor                 # минорный
 *      pnpm release:local -- --first-release       # только при ПЕРВОМ релизе (нет git tag)
 *
 *   2. PROD (`--mode=prod`) → требует явный `--registry=<url>`
 *      pnpm release:prod -- patch --registry=https://registry.npmjs.org
 *      pnpm release:prod -- --registry=https://nexus.company.com/repo/npm/
 *
 * Specifier (позиционный аргумент, передаётся как есть в `nx release`):
 *   patch | minor | major | prerelease | 1.2.3 | <отсутствует — conventional-commits>
 *
 * Авторизация (опционально):
 *   NPM_AUTH_TOKEN — bearer-token для хоста из --registry. Пишется во временный
 *   .npmrc на время публикации, чистится в finally + on SIGINT.
 *
 * Verdaccio URL переопределяется через NPM_REGISTRY_VERDACCIO env (дефолт http://localhost:4873).
 *
 * Внутри: `nx release` не принимает --registry на top-level, поэтому делаем
 * два шага — `version --skip-publish` затем `publish --registry=<url>`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rawArgs = process.argv.slice(2);
const positional = rawArgs.filter((a) => !a.startsWith('--')); // patch / minor / major / 1.2.3 / etc
const args = new Map(
  rawArgs
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);

const VERDACCIO = process.env.NPM_REGISTRY_VERDACCIO || 'http://localhost:4873';

const mode = args.get('mode'); // 'prod' | undefined (=dev)
const groupArg = args.get('group');
const registryArg = args.get('registry');

let registry;
if (mode === 'prod') {
  if (!registryArg || registryArg === true) {
    console.error('[release] --mode=prod требует явный --registry=<url>');
    console.error('  Пример: pnpm release:prod -- --registry=https://registry.npmjs.org');
    process.exit(1);
  }
  registry = String(registryArg);
} else {
  registry = registryArg && registryArg !== true ? String(registryArg) : VERDACCIO;
}

const groupFlag = groupArg && groupArg !== 'all' ? ['--group', groupArg] : [];
const dryRun = args.has('dry-run') ? ['--dry-run'] : [];
const firstRelease = args.has('first-release') ? ['--first-release'] : [];

const run = (cmd) => {
  console.log(`\x1b[36m[release]\x1b[0m pnpm ${cmd.join(' ')}`);
  const r = spawnSync('pnpm', cmd, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return r.status ?? 1;
};

const setupAuth = () => {
  const token = process.env.NPM_AUTH_TOKEN;
  if (!token) return { cleanup: () => {} };

  const url = new URL(registry);
  const base = `//${url.host}${url.pathname.replace(/\/?$/, '/')}`;
  const line = `${base}:_authToken=${token}`;

  const npmrcPath = resolve('.npmrc');
  const backup = existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf8') : null;
  writeFileSync(npmrcPath, `${backup ?? ''}\n# release temp auth\n${line}\n`);
  console.log(`\x1b[36m[release]\x1b[0m auth для ${url.host} → .npmrc`);

  const cleanup = () => {
    try {
      if (backup === null) unlinkSync(npmrcPath);
      else writeFileSync(npmrcPath, backup);
    } catch (e) {
      console.warn(`[release] не удалось восстановить .npmrc: ${e.message}`);
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(130);
  });
  return { cleanup };
};

// Без `dist/` `pnpm publish` соберёт тарбол без кода (в package.json
// `files: ["dist"]`). Гоним билд в две фазы:
//   1) `shared-vite` — он бандлит compliance/file-manager внутрь dist,
//      поэтому его vite.config не требует чужого dist на диске.
//   2) Всё остальное — `shared-*` (кроме biome) + `web-*` + `cli` —
//      используют готовый `shared-vite/dist/index.mjs` (с забандленными
//      compliance/file-manager) в своих vite.config через `libConfig`.
const phases = [
  {
    name: 'shared-vite',
    filters: ['--filter', '@capsule/shared-vite'],
  },
  {
    name: 'shared-* (rest) + web-* + cli',
    filters: [
      '--filter',
      '@capsule/shared-*',
      '--filter',
      '!@capsule/shared-biome',
      '--filter',
      '!@capsule/shared-vite',
      '--filter',
      '@capsule/web-*',
      '--filter',
      '@capsule/cli',
    ],
  },
];

for (const phase of phases) {
  console.log(`\x1b[36m[release]\x1b[0m build phase: ${phase.name}`);
  const status = run([
    '-r',
    '--workspace-concurrency=4',
    ...phase.filters,
    'run',
    'build',
  ]);
  if (status !== 0) {
    console.error(`[release] build phase "${phase.name}" failed — aborting publish`);
    process.exit(status);
  }
}

const versionStatus = run([
  'nx',
  'release',
  ...positional,
  ...groupFlag,
  ...firstRelease,
  ...dryRun,
  '--skip-publish',
  '--verbose',
]);
if (versionStatus !== 0) process.exit(versionStatus);

const auth = setupAuth();
try {
  const publishStatus = run([
    'nx',
    'release',
    'publish',
    ...groupFlag,
    ...firstRelease,
    ...dryRun,
    '--registry',
    registry,
    '--verbose',
  ]);
  process.exit(publishStatus);
} finally {
  auth.cleanup();
}
