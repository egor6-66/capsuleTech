# capsule preview-server

Self-hosted хостинг **web-сборок** capsule-приложений для тестеров. Заливаешь
`apps/<app>/dist` по HTTP с токеном — тестер открывает по ссылке. Без git.

Это «третья ось» релиза рядом с npm-публикацией (Verdaccio) и desktop-бандлами.
Архитектура и обоснование — [ADR 024](../../docs/01-architecture/adr/024-preview-deploy-server.md).

## Модель

- **Загрузка** (`POST /api/deploy/:app`) защищена bearer-токеном (`DEPLOY_TOKEN`).
- **Просмотр** (`GET`) открыт — рассчитано на внутреннюю сеть / VPN.
- **Path-based, один порт.** Каждое приложение раздаётся под своим
  **base-путём** (`/ewc/`), заданным в `apps/<app>/capsule.config.ts`. Работает,
  потому что фреймворк поддерживает base сквозняком: Vite `base` (ассеты под
  `/ewc/assets/...`) + роутер `basepath` (клиентская навигация под `/ewc/`, через
  `import.meta.env.BASE_URL` → `BaseProviders` → `createRouter`). См. ADR 024.
- **Одна версия на приложение** — новый deploy перезаписывает. Версионирование
  помечено как будущая работа.

## Предусловие в приложении

Задай `base` в `apps/<app>/capsule.config.ts` (иначе deploy-клиент откажет —
под корнем `/` path-based раздача невозможна):

```ts
export default defineCapsuleConfig({
  devServerPort: 3000,
  base: '/ewc/', // ← путь раздачи; dev и preview оба под этим префиксом
});
```

## Запуск на сервере (Docker)

```bash
cd docker/preview-server
cp .env.example .env
# отредактируй DEPLOY_TOKEN (и при желании PUBLIC_HOST)
docker compose up -d --build
```

Открой `http://<server>:8080/` — лендинг со списком развёрнутых приложений.
Нужен открытый порт `8080` (один на весь сервер).

## Деплой с dev-машины

Из директории приложения (имя определится автоматически):

```bash
cd apps/ewc
node ../../scripts/deploy-preview.mjs --server=http://<server>:8080 --token=<DEPLOY_TOKEN>
```

Или из корня репозитория:

```bash
DEPLOY_SERVER=http://<server>:8080 DEPLOY_TOKEN=<token> \
  pnpm deploy:preview --app=ewc
```

Клиент соберёт app (`capsule build`), выведет `base` из собранного `index.html`,
упакует `dist` в gzip-tar и зальёт. Флаги: `--app`, `--server`, `--token`,
`--dist=<path>`, `--no-build`. В ответе — ссылка `http://<server>:8080/ewc/`.

## API

| Метод | Путь | Auth | Назначение |
|---|---|---|---|
| `GET`  | `/`               | — | HTML-лендинг со списком сборок |
| `GET`  | `/api/apps`       | — | JSON `[{ app, base, url, deployedAt }]` |
| `POST` | `/api/deploy/:app` | Bearer | приём gzip-tar; base в `X-Capsule-Base` |
| `GET`  | `/<base>/...`     | — | статика приложения + SPA-fallback |

## ENV

| Переменная | Default | Назначение |
|---|---|---|
| `DEPLOY_TOKEN` | — | bearer-токен для deploy (без него deploy отключён) |
| `PORT` | `8080` | HTTP-порт (API + лендинг + раздача) |
| `DATA_DIR` | `/data` | где лежат распакованные сборки (volume) |
| `PUBLIC_HOST` | из Host-хедера | host[:port] для построения ссылок |
| `MAX_UPLOAD_BYTES` | `268435456` | лимит размера загрузки (256 MiB) |

## Локальная проверка без Docker

```bash
DATA_DIR=./_data DEPLOY_TOKEN=test node docker/preview-server/server.mjs
# в другом терминале:
cd apps/ewc && DEPLOY_SERVER=http://localhost:8080 DEPLOY_TOKEN=test \
  node ../../scripts/deploy-preview.mjs
```
