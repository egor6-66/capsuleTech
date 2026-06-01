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

Открой `http://<server>:8080/` — лендинг со списком развёрнутых приложений
(один порт на весь сервер).

> **Порт `8080` должен быть свободен.** Если на нём уже сидит другой сервис
> (частый случай — внешний nginx), Docker не поднимет контейнер («address already
> in use») или ты упрёшься в чужой сервис. Смени host-порт в `docker-compose.yml`
> и используй его везде ниже:
> ```yaml
> ports:
>   - "8090:8080"   # host:container — деплой и просмотр идут на :8090
> ```
> Проверь, что на порту именно наш сервер: `curl http://localhost:<порт>/` должен
> вернуть лендинг «capsule preview builds», а не чужую страницу.

## За reverse-proxy (nginx / traefik)

Если перед сервером стоит reverse-proxy, подними лимит размера тела запроса —
иначе заливка сборки упрётся в дефолт (nginx: 1 МБ) и вернётся `413 Request Entity
Too Large` ещё до node. Для nginx — в блоке `http` / `server` / `location`,
который проксирует на `:8080`:

```nginx
client_max_body_size 256m;   # под стать MAX_UPLOAD_BYTES сервера (256 МБ)
```

Затем `nginx -t && nginx -s reload`. Сам preview-сервер пускает до
`MAX_UPLOAD_BYTES` (по умолчанию 256 МБ).

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

## Траблшутинг

Ключ к диагностике: **JSON-ответ = отвечает наш сервер** (запрос дошёл до node);
**HTML-страница nginx = упёрся в reverse-proxy / чужой сервис** раньше нашего node.

| Симптом | Причина | Фикс |
|---|---|---|
| `413 Request Entity Too Large` (HTML nginx) | reverse-proxy режет тело запроса (дефолт 1 МБ) | `client_max_body_size 256m;` в nginx + `nginx -s reload` (см. «За reverse-proxy») |
| `404 Not Found` (HTML nginx) | на этом порту другой сервис/прокси, не preview-сервер | `curl http://localhost:<порт>/` на сервере — должен быть лендинг «capsule preview builds». Если нет — preview-сервер на другом порту или не поднялся (порт занят, см. «Запуск») |
| `401 {"error":"unauthorized"}` (JSON) | токен клиента ≠ `DEPLOY_TOKEN` сервера | `docker exec <контейнер> printenv DEPLOY_TOKEN` → передай ровно это в `--token`. После правки `.env` пересоздай контейнер: `docker compose up -d`. В PowerShell токен со спецсимволами оборачивай в `'…'` |
| `503 ... DEPLOY_TOKEN не задан` (JSON) | на сервере не задан `DEPLOY_TOKEN` | задай в `.env` + `docker compose up -d` |
| `в сборке base = "/"` (клиент) | не задан `base` в `capsule.config.ts` | добавь `base: '/<app>/'`, пересобери |

## Локальная проверка без Docker

```bash
DATA_DIR=./_data DEPLOY_TOKEN=test node docker/preview-server/server.mjs
# в другом терминале:
cd apps/ewc && DEPLOY_SERVER=http://localhost:8080 DEPLOY_TOKEN=test \
  node ../../scripts/deploy-preview.mjs
```
