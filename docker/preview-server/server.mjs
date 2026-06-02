#!/usr/bin/env node
/* ============================================================================
 * docker/preview-server/server.mjs
 * ---------------------------------------------------------------------------
 * PURPOSE
 *   Самохостящийся preview-сервер для собранных capsule-приложений. Принимает
 *   tarball web-сборки (dist/) по HTTP с токеном и раздаёт каждое приложение
 *   тестерам по ссылке — БЕЗ заливки в git. Это «третья ось» релиза рядом с
 *   npm-публикацией (Verdaccio) и desktop-бандлами. См. ADR 024.
 *
 * PATH-BASED (один порт, раздача под base-путём)
 *   Каждое приложение раздаётся под своим URL-префиксом (`base` из
 *   apps/<app>/capsule.config.ts, например `/ewc/`). Один порт на весь сервер.
 *   Это работает, потому что фреймворк теперь поддерживает base сквозняком:
 *   Vite `base` (ассеты под `/ewc/assets/...`) + роутер `basepath` (клиентская
 *   навигация под `/ewc/`, через import.meta.env.BASE_URL → BaseProviders →
 *   createRouter). См. ADR 024 + docs/_meta/web-router.md.
 *
 * ROOT-APP (хаб)
 *   Приложение, задеплоенное с X-Capsule-Root=true, получает base '/' и
 *   становится КОРНЕВЫМ: раздаётся на '/' и на всё, что не /api/* и не покрыто
 *   зарегистрированным app-base (SPA-fallback). Это место под testing-hub
 *   (ADR 025) — он заменяет inline-лендинг. Root-app один; /api/apps его не
 *   листит (хаб не показывает сам себя).
 *
 * ENDPOINTS
 *   GET  /                   root-app (хаб); если не задеплоен — fallback-лендинг
 *   GET  /api/apps           JSON-список не-корневых { app, base, url, deployedAt }
 *   POST /api/deploy/:app     приём gzip-tar (Authorization: Bearer <token>,
 *                             base в X-Capsule-Base | ?base=, либо X-Capsule-Root)
 *   GET  /<base>/...          статика приложения + SPA-fallback на index.html
 *
 * ENV
 *   PORT                 HTTP port (default 8080)
 *   DATA_DIR             где хранятся распакованные сборки (default /data)
 *   DEPLOY_TOKEN         токен для POST /api/deploy (БЕЗ него deploy отключён)
 *   PUBLIC_HOST          host[:port] для построения ссылок (default — Host-хедер)
 *   MAX_UPLOAD_BYTES     лимит размера загрузки (default 256 MiB)
 *
 * SECURITY MODEL
 *   - Загрузка (POST) защищена bearer-токеном.
 *   - Просмотр (GET) открыт — рассчитано на внутреннюю сеть / VPN (ADR 024).
 *
 * FUTURE(versioning)
 *   Сейчас одна версия на приложение (новый deploy перезаписывает). Раскладка
 *   `${DATA_DIR}/<app>/` чисто расширяется до `${DATA_DIR}/<app>/<version>/`,
 *   а base — до `/ewc/<version>/`. Помечено по месту.
 * ==========================================================================*/
import { spawnSync } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = resolve(process.env.DATA_DIR || '/data');
const TOKEN = process.env.DEPLOY_TOKEN || '';
const PUBLIC_HOST = process.env.PUBLIC_HOST || '';
const MAX_UPLOAD = Number(process.env.MAX_UPLOAD_BYTES || 256 * 1024 * 1024);

const REGISTRY_PATH = join(DATA_DIR, '_registry.json');
// Имя приложения должно быть безопасным сегментом пути (anti-traversal).
const APP_RE = /^[a-z0-9][a-z0-9-]*$/;

// В контейнере (linux) — обычный gnu `tar`. На Windows (локальная проверка без
// Docker) `tar` из PATH под git-bash — MSYS gnu tar, который видит `C:\` как
// remote host. System32 tar.exe (bsdtar) ест Windows-пути корректно.
const TAR_BIN =
  process.platform === 'win32'
    ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    : 'tar';

const ts = () => new Date().toISOString();
const log = (m) => console.log(`\x1b[36m[preview]\x1b[0m ${ts()} ${m}`);
const warn = (m) => console.warn(`\x1b[33m[preview]\x1b[0m ${ts()} ${m}`);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

// ---------------------------------------------------------------------------
// base нормализация: ведущий + завершающий слеш; корень и /api/ запрещены.
// `/ewc` → `/ewc/`, `ewc` → `/ewc/`, `/` → null, `/api/x` → null.
// ---------------------------------------------------------------------------
const normalizeBase = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s.startsWith('/')) s = `/${s}`;
  if (!s.endsWith('/')) s = `${s}/`;
  if (!/^\/[a-z0-9][a-z0-9/_-]*\/$/i.test(s)) return null;
  if (s === '/' || s.startsWith('/api/')) return null;
  return s;
};

// ---------------------------------------------------------------------------
// Registry persistence: app -> { base, deployedAt }
// ---------------------------------------------------------------------------
const loadRegistry = () => {
  if (!existsSync(REGISTRY_PATH)) return {};
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    warn(`не читается registry: ${e.message} — старт с пустого`);
    return {};
  }
};
const saveRegistry = (reg) => {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
};
const hostOf = (req) => PUBLIC_HOST || String(req.headers.host || `localhost:${PORT}`);
const urlFor = (req, base) => `http://${hostOf(req)}${base}`;

// ---------------------------------------------------------------------------
// Раздача файла из appDir (root относительно base) + SPA-fallback на index.html
// ---------------------------------------------------------------------------
const serveFile = (appDir, rel, res) => {
  let filePath = resolve(appDir, `.${rel.startsWith('/') ? rel : `/${rel}`}`);
  // anti-traversal: итоговый путь обязан остаться внутри appDir.
  if (filePath !== appDir && !filePath.startsWith(appDir + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  const isMissing = !existsSync(filePath) || statSync(filePath).isDirectory();
  if (rel === '' || rel === '/' || isMissing) {
    const ext = extname(filePath);
    // Реальный отсутствующий asset (есть расширение, не .html) → 404.
    // Всё остальное (каталог, clean URL, неизвестный путь) → SPA index.
    if (ext && ext !== '.html' && isMissing) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    filePath = join(appDir, 'index.html');
  }
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    return;
  }
  res.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(filePath).pipe(res);
};

// Подобрать приложение по самому длинному base-префиксу запроса.
const matchApp = (reg, urlPath) => {
  const entries = Object.entries(reg).sort(([, a], [, b]) => b.base.length - a.base.length);
  for (const [app, e] of entries) {
    const bare = e.base.slice(0, -1); // '/ewc/' → '/ewc'
    if (urlPath === bare) return { app, base: e.base, rel: '', redirect: true };
    if (urlPath.startsWith(e.base)) return { app, base: e.base, rel: urlPath.slice(e.base.length) };
  }
  return null;
};

// ---------------------------------------------------------------------------
// Deploy: приём gzip-tar и распаковка в ${DATA_DIR}/<app>
// ---------------------------------------------------------------------------
const handleDeploy = (req, res, app) => {
  if (!APP_RE.test(app)) {
    json(res, 400, { error: `invalid app name "${app}" — допустимо [a-z0-9-]` });
    return;
  }
  if (!TOKEN) {
    json(res, 503, { error: 'DEPLOY_TOKEN на сервере не задан — deploy отключён' });
    return;
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token !== TOKEN) {
    json(res, 401, { error: 'unauthorized' });
    return;
  }
  // root-app (хаб): X-Capsule-Root=true → base '/'. Иначе — обычный path-based
  // app с непустым не-корневым base.
  const isRoot = String(req.headers['x-capsule-root'] || '').toLowerCase() === 'true';
  let base;
  if (isRoot) {
    base = '/';
  } else {
    const rawBase =
      req.headers['x-capsule-base'] || new URL(req.url, 'http://x').searchParams.get('base');
    base = normalizeBase(Array.isArray(rawBase) ? rawBase[0] : rawBase);
    if (!base) {
      json(res, 400, {
        error: 'нужен непустой не-корневой base (X-Capsule-Base или ?base=). Пример: /ewc/',
      });
      return;
    }
  }

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_UPLOAD) {
      aborted = true;
      json(res, 413, { error: `upload > ${MAX_UPLOAD} bytes` });
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('error', () => {
    if (!aborted) json(res, 400, { error: 'request stream error' });
  });
  req.on('end', () => {
    if (aborted) return;
    const tmp = join(tmpdir(), `capsule-preview-${app}-${Date.now()}.tgz`);
    const appDir = join(DATA_DIR, app);
    try {
      writeFileSync(tmp, Buffer.concat(chunks));
      // Single-version: перезаписываем целиком. FUTURE(versioning): вложенный
      // <version>-подкаталог + base `/ewc/<version>/` вместо очистки.
      rmSync(appDir, { recursive: true, force: true });
      mkdirSync(appDir, { recursive: true });
      const r = spawnSync(TAR_BIN, ['-xzf', tmp, '-C', appDir]);
      if (r.status !== 0) {
        json(res, 500, { error: 'tar extract failed', detail: String(r.stderr || '') });
        return;
      }
      if (!existsSync(join(appDir, 'index.html'))) {
        json(res, 400, {
          error: 'в архиве нет index.html в корне (ожидается dist/, упакованный как `-C dist .`)',
        });
        return;
      }
      const reg = loadRegistry();
      // root-app один: сбрасываем прежний root, если это другая аппа.
      if (isRoot) {
        for (const k of Object.keys(reg)) if (reg[k].root && k !== app) delete reg[k];
      }
      reg[app] = { base, deployedAt: ts(), ...(isRoot ? { root: true } : {}) };
      saveRegistry(reg);
      log(`deploy "${app}" (${size} bytes) → ${urlFor(req, base)}`);
      json(res, 200, { app, base, url: urlFor(req, base) });
    } catch (e) {
      json(res, 500, { error: e.message });
    } finally {
      rmSync(tmp, { force: true });
    }
  });
};

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
// Fallback-лендинг: показывается только когда root-app (хаб) НЕ задеплоен.
// Задеплой хаб (`deploy-preview.mjs --root`) — он заменит эту страницу.
const landing = (req, res) => {
  const reg = loadRegistry();
  const apps = Object.entries(reg)
    .filter(([, e]) => !e.root)
    .sort(([a], [b]) => a.localeCompare(b));
  const rows = apps.length
    ? apps
        .map(([name, e]) => {
          const url = urlFor(req, e.base);
          return `<li><a href="${url}">${name}</a> <small>${e.base} · ${e.deployedAt || '—'}</small></li>`;
        })
        .join('\n')
    : '<li><em>пока ничего не развёрнуто</em></li>';
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>capsule preview</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1rem;color:#1a1a1a}
h1{font-size:1.3rem}p{color:#666}ul{list-style:none;padding:0}li{padding:.4rem 0;border-bottom:1px solid #eee}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}small{color:#888;margin-left:.5rem}</style>
</head><body><h1>capsule preview builds</h1>
<p>Хаб (root-app) ещё не задеплоен — задеплой его через <code>deploy-preview.mjs --root</code>. Пока — список сборок:</p>
<ul>${rows}</ul></body></html>`;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const method = req.method || 'GET';

  const deploy = urlPath.match(/^\/api\/deploy\/([^/]+)\/?$/);
  if (deploy && method === 'POST') {
    handleDeploy(req, res, decodeURIComponent(deploy[1]));
    return;
  }
  if (urlPath === '/api/apps' && method === 'GET') {
    const reg = loadRegistry();
    json(
      res,
      200,
      Object.entries(reg)
        .filter(([, e]) => !e.root) // хаб (root-app) сам себя не листит
        .map(([app, e]) => ({
          app,
          base: e.base,
          url: urlFor(req, e.base),
          deployedAt: e.deployedAt || null,
        })),
    );
    return;
  }

  // Раздача: зарегистрированные app по base-префиксу. root-app (base '/')
  // отсортирован в matchApp последним и ловит всё непокрытое, включая '/'.
  if (method === 'GET') {
    const hit = matchApp(loadRegistry(), urlPath);
    if (hit) {
      if (hit.redirect) {
        res.writeHead(301, { location: hit.base }).end();
        return;
      }
      serveFile(join(DATA_DIR, hit.app), hit.rel, res);
      return;
    }
    // Ничего не совпало → root-app (хаб) не задеплоен. '/' → fallback-лендинг.
    if (urlPath === '/') {
      landing(req, res);
      return;
    }
  }
  res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
mkdirSync(DATA_DIR, { recursive: true });
server.listen(PORT, () => {
  log(`→ :${PORT} · data=${DATA_DIR}`);
  if (!TOKEN) warn('DEPLOY_TOKEN не задан — POST /api/deploy будет отвечать 503');
});
