#!/usr/bin/env node
/* ============================================================================
 * scripts/deploy-preview.mjs
 * ---------------------------------------------------------------------------
 * PURPOSE
 *   Залить web-сборку приложения (apps/<app>/dist) на self-hosted
 *   preview-сервер (docker/preview-server), чтобы тестеры открыли её по ссылке
 *   — БЕЗ коммита/пуша в git. Клиент к POST /api/deploy/:app. См. ADR 024.
 *
 * USAGE
 *   # из директории приложения (app определяется автоматически):
 *   cd apps/ewc && node ../../scripts/deploy-preview.mjs --server=http://my-host:8080
 *
 *   # или явно:
 *   pnpm deploy:preview --app=ewc --server=http://my-host:8080
 *
 * FLAGS / ENV
 *   --app=<name>        имя приложения (default — определяется из cwd: apps/<name>)
 *   --server=<url>      URL preview-сервера   (env DEPLOY_SERVER)
 *   --token=<token>     bearer-токен deploy   (env DEPLOY_TOKEN)
 *   --dist=<path>       путь к собранному dist (default apps/<app>/dist)
 *   --no-build          не собирать заново, использовать существующий dist/
 *
 * NB: server URL и token НЕ хардкодятся (закрытый контур) — только флаги/env.
 * ==========================================================================*/
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// На Windows берём System32 tar.exe (bsdtar) явно: `tar` из PATH под git-bash —
// это MSYS GNU tar, который трактует `C:\path` как remote host (`host:path`) и
// падает «Cannot connect to C:». System32 tar.exe корректно ест Windows-пути.
const TAR_BIN =
  process.platform === 'win32'
    ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const flag = (k, env) => {
  const v = args.get(k);
  if (v && v !== true) return String(v);
  return env ? process.env[env] : undefined;
};

const log = (m) => console.log(`\x1b[36m[deploy-preview]\x1b[0m ${m}`);
const fail = (m) => {
  console.error(`\x1b[31m[deploy-preview]\x1b[0m ${m}`);
  process.exit(1);
};

// ---------------------------------------------------------------------------
// 1. Определяем app + appRoot
// ---------------------------------------------------------------------------
const detectApp = () => {
  const explicit = flag('app');
  if (explicit) return explicit;
  // cwd вида .../apps/<name>[/...] → берём <name>
  const cwd = process.cwd().replace(/\\/g, '/');
  const m = cwd.match(/\/apps\/([^/]+)(?:\/|$)/);
  if (m) return m[1];
  return undefined;
};

const app = detectApp();
if (!app) fail('не удалось определить app — запусти из apps/<name>/ или передай --app=<name>');
if (!/^[a-z0-9][a-z0-9-]*$/.test(app)) fail(`недопустимое имя app "${app}" — ожидается [a-z0-9-]`);

const appRoot = join(repoRoot, 'apps', app);
if (!existsSync(appRoot)) fail(`apps/${app} не найден в ${repoRoot}`);

const server = flag('server', 'DEPLOY_SERVER');
if (!server) fail('нужен --server=<url> или env DEPLOY_SERVER');
const token = flag('token', 'DEPLOY_TOKEN');
if (!token) fail('нужен --token=<token> или env DEPLOY_TOKEN');

// ---------------------------------------------------------------------------
// 2. Сборка (если не --no-build) — дёргаем штатный capsule build
// ---------------------------------------------------------------------------
const distPath = flag('dist') ? resolve(String(flag('dist'))) : join(appRoot, 'dist');

if (!args.has('no-build')) {
  log(`сборка apps/${app} (capsule build)…`);
  const cliBin = join(repoRoot, 'packages', 'cli', 'bin', 'capsule.mjs');
  const r = spawnSync('node', [cliBin, 'build'], {
    cwd: appRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if ((r.status ?? 1) !== 0) fail('сборка упала — деплой отменён');
} else {
  log('--no-build: использую существующий dist/');
}

if (!existsSync(distPath) || !statSync(distPath).isDirectory()) {
  fail(`dist не найден: ${distPath}`);
}
if (!existsSync(join(distPath, 'index.html'))) {
  fail(`в ${distPath} нет index.html — это точно собранный web-build?`);
}

// ---------------------------------------------------------------------------
// 3. Упаковка dist в gzip-tar (файлы в корне архива: `-C dist .`)
// ---------------------------------------------------------------------------
const tmp = join(tmpdir(), `capsule-preview-${app}-${Date.now()}.tgz`);
log(`упаковка ${distPath} → ${tmp}`);
const tarRes = spawnSync(TAR_BIN, ['-czf', tmp, '-C', distPath, '.'], { stdio: 'inherit' });
if ((tarRes.status ?? 1) !== 0) {
  fail('tar не отработал — нужен системный tar (Win10+/macOS/Linux его имеют)');
}

// ---------------------------------------------------------------------------
// 4. POST на сервер
// ---------------------------------------------------------------------------
const endpoint = `${server.replace(/\/$/, '')}/api/deploy/${app}`;
log(`POST ${endpoint}`);
try {
  const body = readFileSync(tmp);
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/gzip',
    },
    body,
  });
  const text = await resp.text();
  if (!resp.ok) fail(`сервер ответил ${resp.status}: ${text}`);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail(`неожиданный ответ сервера: ${text}`);
  }
  log(`\x1b[32m✓ развёрнуто:\x1b[0m ${app} → ${data.url}`);
} catch (e) {
  fail(`не удалось достучаться до сервера: ${e.message}`);
} finally {
  rmSync(tmp, { force: true });
}
