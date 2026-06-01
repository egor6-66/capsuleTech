# capsule preview-server

Self-hosted хостинг **web-сборок** capsule-приложений для тестеров. Заливаешь
`apps/<app>/dist` по HTTP с токеном — тестер открывает по ссылке. Без git.

Это «третья ось» релиза рядом с npm-публикацией (Verdaccio) и desktop-бандлами.
Архитектура и обоснование — [ADR 024](../../docs/01-architecture/adr/024-preview-deploy-server.md).

## Модель

- **Загрузка** (`POST /api/deploy/:app`) защищена bearer-токеном (`DEPLOY_TOKEN`).
- **Просмотр** (`GET`) открыт — рассчитано на внутреннюю сеть / VPN.
- Каждое приложение раздаётся **на своём порту** в корне `/` (base `/`, router
  `/` — идентично dev). Почему не под-пути: capsule-роутер не выставляет
  TanStack `basepath`, под-путь сломал бы клиентскую навигацию (см. ADR 024).
- **Одна версия на приложение** — новый deploy перезаписывает. Версионирование
  помечено как будущая работа.

## Запуск на сервере (Docker)

```bash
cd docker/preview-server
cp .env.example .env
# отредактируй DEPLOY_TOKEN (и при желании PUBLIC_HOST)
docker compose up -d --build
```

Открой `http://<server>:8080/` — лендинг со списком развёрнутых приложений.

Порты: `8080` — API + лендинг, `8100-8120` — по одному на приложение. Открой их
в фаерволе. Если приложений больше 21 — расширь диапазон в `docker-compose.yml`
и `Dockerfile` (`EXPOSE`).

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

Клиент соберёт app (`capsule build`), упакует `dist` в gzip-tar и зальёт.
Флаги: `--app`, `--server`, `--token`, `--dist=<path>`, `--no-build`.
В ответе — ссылка вида `http://<server>:8100/`.

## API

| Метод | Путь | Auth | Назначение |
|---|---|---|---|
| `GET`  | `/`               | — | HTML-лендинг со списком сборок |
| `GET`  | `/api/apps`       | — | JSON `[{ app, port, url, deployedAt }]` |
| `POST` | `/api/deploy/:app` | Bearer | приём gzip-tar сборки (`-C dist .`) |

## ENV

| Переменная | Default | Назначение |
|---|---|---|
| `DEPLOY_TOKEN` | — | bearer-токен для deploy (без него deploy отключён) |
| `PORT` | `8080` | main HTTP-порт (API + лендинг) |
| `PREVIEW_PORT_BASE` | `8100` | первый порт под приложения |
| `DATA_DIR` | `/data` | где лежат распакованные сборки (volume) |
| `PUBLIC_HOST` | из Host-хедера | host/IP для построения ссылок |
| `MAX_UPLOAD_BYTES` | `268435456` | лимит размера загрузки (256 MiB) |

## Локальная проверка без Docker

```bash
DATA_DIR=./_data DEPLOY_TOKEN=test node docker/preview-server/server.mjs
# в другом терминале:
DEPLOY_SERVER=http://localhost:8080 DEPLOY_TOKEN=test \
  node scripts/deploy-preview.mjs --app=ewc
```
