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
 * WHY PORT-PER-APP (а не один порт + под-пути)
 *   capsule-роутер (@capsuletech/web-router → createRouter) НЕ читает
 *   import.meta.env.BASE_URL и не выставляет TanStack `basepath`. Поэтому SPA,
 *   раздаваемый под `/p/<app>/`, ломает клиентскую навигацию (router ждёт
 *   корень `/`). Чтобы фича работала без правок фреймворка, каждое приложение
 *   раздаётся на СВОЁМ порту в корне `/` — base `/`, router `/`, всё как в dev.
 *   Под-путь/subdomain-роутинг через reverse-proxy — будущая работа (ADR 024).
 *
 * ENDPOINTS (main port, default 8080)
 *   GET  /                  HTML-лендинг со списком развёрнутых приложений
 *   GET  /api/apps          JSON-список { app, port, url, deployedAt }
 *   POST /api/deploy/:app    приём gzip-tar сборки (Authorization: Bearer <token>)
 *
 * Каждое приложение дополнительно слушает свой порт из диапазона
 *   [PREVIEW_PORT_BASE .. ] и раздаёт статику с SPA-fallback на index.html.
 *
 * ENV
 *   PORT                 main HTTP port (default 8080)
 *   PREVIEW_PORT_BASE    первый порт под приложения (default 8100)
 *   DATA_DIR             где хранятся распакованные сборки (default /data)
 *   DEPLOY_TOKEN         токен для POST /api/deploy (БЕЗ него deploy отключён)
 *   PUBLIC_HOST          host/IP для построения ссылок (default — из Host-хедера)
 *   MAX_UPLOAD_BYTES     лимит размера загрузки (default 256 MiB)
 *
 * SECURITY MODEL
 *   - Загрузка (POST) защищена bearer-токеном.
 *   - Просмотр (GET) открыт — рассчитано на внутреннюю сеть / VPN (ADR 024).
 *
 * FUTURE(versioning)
 *   Сейчас одна версия на приложение (новый deploy перезаписывает). Раскладка
 *   `${DATA_DIR}/<app>/` чисто расширяется до `${DATA_DIR}/<app>/<version>/`,
 *   а endpoint — до `POST /api/deploy/:app/:version`. Помечено по месту.
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
const PORT_BASE = Number(process.env.PREVIEW_PORT_BASE || 8100);
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
// Registry persistence: app -> { port, deployedAt }
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
const allocatePort = (reg) => {
  const used = new Set(Object.values(reg).map((e) => e.port));
  let p = PORT_BASE;
  while (used.has(p)) p++;
  return p;
};

// ---------------------------------------------------------------------------
// JSON helper
// ---------------------------------------------------------------------------
const json = (res, code, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
};
const hostFromReq = (req) => PUBLIC_HOST || String(req.headers.host || 'localhost').split(':')[0];
const urlFor = (req, port) => `http://${hostFromReq(req)}:${port}/`;

// ---------------------------------------------------------------------------
// Static per-app server (root serving + SPA fallback)
// ---------------------------------------------------------------------------
const statics = new Map(); // app -> http.Server

const serveStatic = (app, req, res) => {
  const appDir = join(DATA_DIR, app);
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  let filePath = resolve(appDir, `.${urlPath}`);
  // anti-traversal: итоговый путь обязан остаться внутри appDir.
  if (filePath !== appDir && !filePath.startsWith(appDir + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  const isMissing = !existsSync(filePath) || statSync(filePath).isDirectory();
  if (urlPath.endsWith('/') || isMissing) {
    const ext = extname(filePath);
    // Реальный отсутствующий asset (есть расширение, не .html) → 404.
    // Всё остальное (директория, clean URL, неизвестный путь) → SPA index.
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

const ensureStatic = (app, port) => {
  if (statics.has(app)) return;
  const srv = createServer((req, res) => serveStatic(app, req, res));
  srv.on('error', (e) => warn(`static[${app}] :${port} — ${e.message}`));
  srv.listen(port, () => log(`app "${app}" → :${port}`));
  statics.set(app, srv);
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
      // Single-version: перезаписываем целиком. FUTURE(versioning): сюда зайдёт
      // вложенный <version>-подкаталог вместо очистки.
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
      if (!reg[app]) reg[app] = { port: allocatePort(reg) };
      reg[app].deployedAt = ts();
      saveRegistry(reg);
      ensureStatic(app, reg[app].port);
      log(`deploy "${app}" (${size} bytes) → ${urlFor(req, reg[app].port)}`);
      json(res, 200, { app, port: reg[app].port, url: urlFor(req, reg[app].port) });
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
const landing = (req, res) => {
  const reg = loadRegistry();
  const apps = Object.entries(reg).sort(([a], [b]) => a.localeCompare(b));
  const rows = apps.length
    ? apps
        .map(([name, e]) => {
          const url = urlFor(req, e.port);
          return `<li><a href="${url}">${name}</a> <small>:${e.port} · ${e.deployedAt || '—'}</small></li>`;
        })
        .join('\n')
    : '<li><em>пока ничего не развёрнуто</em></li>';
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>capsule preview</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:720px;margin:3rem auto;padding:0 1rem;color:#1a1a1a}
h1{font-size:1.3rem}ul{list-style:none;padding:0}li{padding:.4rem 0;border-bottom:1px solid #eee}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}small{color:#888;margin-left:.5rem}</style>
</head><body><h1>capsule preview builds</h1><ul>${rows}</ul></body></html>`;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
};

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------
const main = createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  const method = req.method || 'GET';

  const deploy = url.match(/^\/api\/deploy\/([^/]+)\/?$/);
  if (deploy && method === 'POST') {
    handleDeploy(req, res, decodeURIComponent(deploy[1]));
    return;
  }
  if (url === '/api/apps' && method === 'GET') {
    const reg = loadRegistry();
    json(
      res,
      200,
      Object.entries(reg).map(([app, e]) => ({
        app,
        port: e.port,
        url: urlFor(req, e.port),
        deployedAt: e.deployedAt || null,
      })),
    );
    return;
  }
  if (url === '/' && method === 'GET') {
    landing(req, res);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
mkdirSync(DATA_DIR, { recursive: true });
const boot = loadRegistry();
for (const [app, e] of Object.entries(boot)) {
  if (existsSync(join(DATA_DIR, app, 'index.html'))) ensureStatic(app, e.port);
}
main.listen(PORT, () => {
  log(`main → :${PORT} · data=${DATA_DIR} · port-base=${PORT_BASE}`);
  if (!TOKEN) warn('DEPLOY_TOKEN не задан — POST /api/deploy будет отвечать 503');
});
