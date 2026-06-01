---
tags: [hca, adr, release, docker, router, proposed]
status: proposed
date: 2026-06-01
---

# ADR 024 — Preview-deploy server для web-сборок

> [!note] Status: proposed (2026-06-01)
> Self-hosted сервер (`docker/preview-server/`) + deploy-клиент (`scripts/deploy-preview.mjs`) для заливки `apps/<app>/dist` тестерам по ссылке без git. Path-based раздача под `base`-путём приложения (один порт). Потребовала добавления сквозной поддержки `base` во фреймворк (Vite `base` + router `basepath`). MVP: одна версия на app, загрузка по токену, просмотр открыт.

## Контекст

У capsule две оси релиза, обе про другое: npm-пакеты → Verdaccio; сборки приложений → `capsule build` (статический `dist/`) и `capsule desktop build` (Tauri-бандл), артефакт лежит локально.

Запрос: на сервере с Docker заливать dev-сборки, чтобы тестеры смотрели их в браузере по ссылке — без git. Это **третья ось**: хостинг превью-сборок. Docker-инфры в репозитории не было.

## Проблема

**1. Vite-SPA под под-путём.** Чтобы раздавать несколько приложений на одном сервере без wildcard-DNS, естественный способ — под-путь `/<app>/`. Но:
- ассеты: Vite по умолчанию `base: '/'` → `/assets/...` ломаются под под-путём;
- **клиентский роутер**: `@capsuletech/web-router` (`createRouter`) не выставлял TanStack `basepath`, поэтому под `/ewc/` навигация ломалась (роутер ждал корень).

**2. Первый дизайн (порт-на-приложение) был обходом.** Изначально сервер раздавал каждое приложение на своём порту в корне `/`, чтобы НЕ чинить базу/роутер. Это работало, но: порты вместо путей, диапазон в фаерволе, не та модель, что просил пользователь («задать любой путь в конфиге»). Per POLICY это обход, а не фикс — отклонено в пользу правильного решения.

**3. Хардкод адресов недопустим** — закрытый контур ([[air-gapped-constraint]]).

## Решение

### Сквозная поддержка `base` во фреймворке

`base` задаётся в `apps/<app>/capsule.config.ts` и доезжает двумя путями:

1. **Ассеты** — `base` → Vite `base` (owner-builders): новое поле `ICapsuleConfig.base?: string` (default `'/'`), пробрасывается в Vite-конфиг в dev и build. Ассеты собираются под `/ewc/assets/...`.
2. **Роутер** — через `import.meta.env.BASE_URL` как проп (3 звена):
   ```
   generated bootstrap (.capsule/, app-код → BASE_URL = base приложения)
     └─ <BaseProviders basepath={import.meta.env.BASE_URL}>   ← owner-builders (CapsuleRegistryPlugin)
          └─ createRouter({ …, basepath })                    ← owner-web-core (BaseProviders)
               └─ createTanStackRouter({ …, basepath })        ← owner-web-router (normalizeBase)
   ```
   Ключ: `<BaseProviders>` генерится в `.capsule/` и собирается Vite самого приложения, поэтому `import.meta.env.BASE_URL` резолвится в base приложения. Значение едет обычным пропом сверху вниз — **без хаков с inlining в dist пред-собранных пакетов**.

`normalizeBase` (web-router) приводит `/ewc/` → `/ewc`, а `'/'`/пусто → `undefined` (дефолт не меняется). `current()` остаётся app-relative — TanStack срезает basepath на input-rewrite.

### Path-based раздача, один порт

Сервер раздаёт каждое приложение под его `base` на одном порту (longest-prefix match, SPA-fallback на `index.html` под base). `dev` и `preview` консистентны: оба под `/ewc/`.

### Загрузка по токену, просмотр открыт

`POST /api/deploy/:app` под bearer-токеном (`DEPLOY_TOKEN`), `base` в заголовке `X-Capsule-Base`. `GET` открыт (внутренняя сеть / VPN).

### Одна версия на приложение

Новый deploy перезаписывает `${DATA_DIR}/<app>/`. Расширяется до `/<app>/<version>/` + base `/ewc/<version>/` — `FUTURE(versioning)` по месту.

### Клиент выводит base из сборки

`scripts/deploy-preview.mjs` собирает app, читает `base` из `dist/index.html` (префикс ассетов), шлёт в `X-Capsule-Base`. Если base `'/'` — отказ с подсказкой задать `base` в конфиге. Сервер/токен — только флаги/env.

## Артефакты

- Framework: `ICapsuleConfig.base` + Vite-проводка + генерация `basepath` (builders); `basepath` проп (web-core); `basepath`+`normalizeBase` (web-router).
- `docker/preview-server/{server.mjs,Dockerfile,docker-compose.yml,.env.example,README.md}`.
- `scripts/deploy-preview.mjs`; `package.json` → `deploy:preview`.

## Последствия

- ✅ Тестеры открывают сборку по красивому пути `http://server:8080/ewc/`, навигация работает как в dev.
- ✅ Один порт — без диапазона в фаерволе, без wildcard-DNS.
- ✅ `base` в конфиге — полезная фичу фреймворка сама по себе (развёртывание не-в-корне).
- ✅ Закрытый контур: ни одного захардкоженного URL.
- ⚠️ Просмотр открыт — не для внешнего интернета без доп. защиты (reverse-proxy + auth).
- ⚠️ Приложение обязано задать непустой `base` для preview (под корнем `/` не раздать).

## Альтернативы (отклонены)

- **Порт-на-приложение** (первый дизайн) — обход вместо фикса базы/роутера; порты, диапазон в фаерволе.
- **Subdomain + wildcard-DNS** — лишнее допущение в закрытом контуре.
- **Docker-образ на сборку** — registry + оркестрация, тяжело.

## Будущая работа

- Версионирование (несколько сборок на app, base на ветку/тег).
- Графитация клиента в `capsule deploy` (owner-cli).
- Reverse-proxy режим / basic-auth на просмотр, авто-очистка по TTL.
