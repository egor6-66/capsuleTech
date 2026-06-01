---
tags: [hca, adr, release, docker, proposed]
status: proposed
date: 2026-06-01
---

# ADR 024 — Preview-deploy server для web-сборок

> [!note] Status: proposed (2026-06-01)
> Self-hosted сервер (`docker/preview-server/`) + deploy-клиент (`scripts/deploy-preview.mjs`) для заливки `apps/<app>/dist` тестерам по ссылке без git. MVP: одна версия на app, раздача по порту на app, просмотр открыт / загрузка по токену. Зона главного assistant (shared infra), не owner-* пакет.

## Контекст

У capsule сейчас **две оси релиза**, обе про другое:

1. **npm-пакеты** → Verdaccio (`scripts/release-local.mjs`, `release.mjs`). Публикует `@capsuletech/*`, не приложения.
2. **Сборки приложений** → `capsule build` (`buildCapsuleApp` из `@capsuletech/vite-builder`) кладёт статический `dist/` в `apps/<app>/dist`; `capsule desktop build` — Tauri-бандл. Дальше артефакт просто лежит локально.

Запрос: на сервере с Docker поднять возможность **заливать dev-сборки**, чтобы тестеры смотрели их в браузере по ссылке — **без заливки в git**.

Это **третья ось**: хостинг превью-сборок приложений. Концептуально — «как Verdaccio, только для собранных аппов, а не npm-пакетов». В репозитории нет никакой Docker-инфры (ни Dockerfile, ни compose).

## Проблема

**1. Vite-SPA под под-путём ломается.** Если раздавать `dist` под `/<app>/`, абсолютные ассеты (`/assets/...`, Vite `base` по умолчанию `/`) не резолвятся. `base` чинится при сборке, **но** `@capsuletech/web-router` (`createRouter`) **не** читает `import.meta.env.BASE_URL` и не выставляет TanStack `basepath` (grep по `basepath|BASE_URL` пуст). Значит клиентская навигация под под-путём поедет в любом случае — это правка фреймворка (owner-web-router), вне зоны этой задачи.

**2. Subdomain-роутинг требует DNS.** Классический preview (Host-based virtual hosting, `myapp.preview.host`) даёт корневую раздачу, но требует wildcard-DNS. В закрытом контуре ([[air-gapped-constraint]]) это лишнее допущение.

**3. Хардкод адресов недопустим.** Сервер и токен не должны быть зашиты — закрытый контур, у каждого свой хост.

**4. Зональность.** `capsule deploy` как CLI-команда — зона owner-cli (`packages/cli`). Расширение типа конфига — owner-builders (`ICapsuleConfig`). Хочется contained MVP в одной зоне.

## Решение

### Порт на приложение, раздача в корне `/`

Каждое приложение раздаётся на своём порту (`PREVIEW_PORT_BASE` + N) в корне `/`. base `/`, router `/`, SPA-fallback на `index.html` — **идентично dev**. Это обходит и проблему ассетов, и отсутствие `basepath`, **без правок фреймворка**. Цена — порты вместо красивых под-путей (приемлемо для внутренней сети) и диапазон портов в фаерволе.

### Загрузка по токену, просмотр открыт

`POST /api/deploy/:app` защищён bearer-токеном (`DEPLOY_TOKEN`). `GET` открыт — рассчитано на внутреннюю сеть / VPN (выбор пользователя: «открыто в сети»).

### Одна версия на приложение

Новый deploy перезаписывает `${DATA_DIR}/<app>/`. Раскладка чисто расширяется до `${DATA_DIR}/<app>/<version>/` — версионирование помечено `FUTURE(versioning)` по месту (server.mjs, README), endpoint расширяется до `/api/deploy/:app/:version`.

### Скрипт, не CLI-команда

Клиент — `scripts/deploy-preview.mjs` (shared infra, зона главного), не `capsule deploy`. Держит MVP в одной зоне, без касания `packages/cli` и `ICapsuleConfig`. Сервер/токен — только флаги/env (`--server`/`DEPLOY_SERVER`, `--token`/`DEPLOY_TOKEN`). Графитация в `capsule deploy` через owner-cli — будущая работа.

### Транспорт

Клиент собирает app (`capsule build`), пакует `dist` системным `tar -czf -C dist .` (есть на Win10+/macOS/Linux) и шлёт gzip-tar как тело POST. Сервер пишет во временный файл и распаковывает `tar -xzf` (gnu tar в alpine). Zero npm-deps с обеих сторон.

## Артефакты

- `docker/preview-server/server.mjs` — zero-dep Node: API + лендинг + per-app static.
- `docker/preview-server/{Dockerfile,docker-compose.yml,.env.example,README.md}`.
- `scripts/deploy-preview.mjs` — deploy-клиент.
- `package.json` → скрипт `deploy:preview`.

## Последствия

- ✅ Тестеры открывают web-сборку по ссылке без git; работает как dev (корневая раздача).
- ✅ Никаких правок фреймворковых пакетов — contained PR в shared-infra зоне.
- ✅ Закрытый контур: ни одного захардкоженного URL.
- ⚠️ Порт на приложение — диапазон надо открыть в фаерволе; >21 app требует расширения диапазона.
- ⚠️ Просмотр открыт — не для внешнего интернета без доп. защиты (reverse-proxy + auth).

## Альтернативы (отклонены для MVP)

- **Под-путь `/<app>/` + base-инъекция** — требует `basepath` в роутере (owner-web-router).
- **Subdomain + reverse-proxy** — требует wildcard-DNS; противоречит air-gapped-допущению.
- **Docker-образ на сборку** — registry + оркестрация, тяжело для «тестер смотрит билд».

## Будущая работа

- Версионирование (несколько сборок на app, URL на ветку/тег).
- Графитация клиента в `capsule deploy` (owner-cli) + опциональная секция `deploy` в `capsule.config.ts` (owner-builders).
- Reverse-proxy режим (один порт, под-пути/subdomain) — после `basepath` в роутере.
- Авто-очистка по TTL, basic-auth на просмотр.
