# ТЗ — Testing Hub (`apps/testhub`)

> Исполнителю: это бриф для самостоятельной работы без контекста предыдущего чата.
> Архитектура и роадмап — [[025-testing-hub-and-monitor|ADR 025]]; существующая
> preview-инфра — [[024-preview-deploy-server|ADR 024]]. ADR 025 сейчас в **открытом PR #232** — смержи его в main перед стартом, чтобы видеть полный план.

## 0. Цель

Вырастить preview-deploy-сервер (ADR 024) в **полноценную testing-платформу**: один Docker на сервере поднимает хост, в нём — каталог развёрнутых апп, заход/тест внутри хаба (iframe), доки + git-инфа, фидбек, мониторинг, версии. Строим **стандартным capsule-флоу** (догфуд). Итеративно (И1→И7), маленькими шагами.

## 1. Жёсткие правила (НЕ нарушать — на этом уже накосячили)

1. **Разработка и верификация — ТОЛЬКО ЛОКАЛЬНО.**
   - Хаб-UI: `cd apps/testhub && capsule dev` (localhost).
   - Serve/deploy-флоу: **локальный** preview-server — `DATA_DIR=./tmp/preview node docker/preview-server/server.mjs` + деплой на `http://localhost:<port>`.
   - **НЕ ДЕПЛОИТЬ на боевой сервер пользователя `172.16.211.136:8090`** в процессе разработки. Это его прод-инстанс для реальных тестеров. Деплой туда — отдельный шаг **по явному решению пользователя**, не часть итерации.

2. **Apps создавать ТОЛЬКО через CLI.** Скаффолд — `capsule create-app <name>` (action `createApp` → `scaffoldEntity`, `packages/cli/src/actions/create-app.ts`), запуск через workspace-бинарь: `node packages/cli/bin/capsule.mjs create-app testhub` (или TUI). **Не писать файлы аппа руками** — это даёт канонический скелет И догфудит сам CLI (баги CLI — ценная находка).

3. **Ритм per-пункт.** Перед каждым пунктом роадмапа: **кратко обсудить с пользователем «что и как» + развилки → получить ОК → сделать пункт целиком → commit/PR per пункт.** Не дробить на микро-правки, но и не лететь без обсуждения.

4. **HCA-конвенции.** Слои Entity/View/Shape/Controller/Feature/Widget/Page; каждый файл уровня заканчивается `export default <Name>;`; UI-события через `meta`-теги; `base` в `apps/<app>/capsule.config.ts`; типовые артефакты **делегировать субагентам** (view/widget/page/feature/entity/shape/controller). Композиция — только в Widget. См. CLAUDE.md.

5. **`packages/*` — через owner-агентов.** Главный/исполнитель правит только `apps/` + shared-infra (`scripts/`, `docker/`). Нужна framework-правка — делегировать `owner-<pkg>`, не патчить движок напрямую.

## 2. Что уже готово (строить ПОВЕРХ, не переделывать)

- **preview-server** — `docker/preview-server/server.mjs`: path-based раздача (один порт, `/ewc/` под base), `POST /api/deploy/:app` (bearer-токен, base в `X-Capsule-Base`), `GET /api/apps` (JSON список), `--mocks`-сборки. + Dockerfile/compose/.env/README.
- **deploy-клиент** — `scripts/deploy-preview.mjs`: build → tar dist → POST; флаги `--mocks` (CAPSULE_MOCKS), `--no-build`, `--dist`, `--app`; выводит `base` из `dist/index.html`.
- **base-support во фреймворке** — `ICapsuleConfig.base` (Vite base) + router `basepath` (через `import.meta.env.BASE_URL` → BaseProviders → createRouter). Апп раздаётся не-в-корне.
- **mocks-флаг** — `__CAPSULE_MOCKS__` define (из `CAPSULE_MOCKS` env / `--mocks`); хелпер-паттерн `__CAPSULE_MOCKS__ ? mockHandler : undefined` (tree-shake). Пример — `apps/ewc/src/endpoints/*`.
- **ewc** — рабочий пример апп с `base: '/ewc/'`, мок-эндпоинтами.

## 3. Архитектура (из ADR 025, сжато)

- **Хаб** = capsule-app `apps/testhub`, `base: '/'`, деплоится **тем же** `deploy-preview.mjs` в **корневой слот** (флаг `--root`). Сервер отдаёт его на `/` и на всё, что не `/api/*` и не зарегистрированный app-base (SPA-fallback) — заменяет inline-HTML лендинг.
- **Запуск апп в хабе — через iframe** (`<iframe src="/ewc/">`). Причина: каждый capsule-app — независимый билд со **своим синглтон-роутером и глобальным реестром** (`globalThis`); два аппа в одном JS-контексте конфликтуют. iframe изолирует; хаб↔апп — через `postMessage`. (`@capsuletech/web-remote` — будущее, сейчас Phase 0.)
- **Бэкенд** — внутри preview-server, self-contained (SQLite/JSON в volume). Чат/real-time — потом, отдельный ADR.
- **Метаданные (git/доки/версия)** — снимаются **на деплое** (билд статичный, в нём нет `.git`/`docs/`), едут как метаданные.
- **Монитор** — расширение `@capsuletech/web-profiler` (Query/State/Logs collectors + панели), **детачабл-слой**: opt-in instrumentation seam'ы, **не пускает корни в движок**. web-query — свой кэш (не TanStack Query) → «query inspector» из своего источника.

## 4. Роадмап

| Итерация | Что | Зоны |
|---|---|---|
| **И1** | `apps/testhub`: каталог апп + iframe-воркспейс (вместо HTML-лендинга) | apps/testhub + preview-server + deploy-client |
| **И2** | git/доки на деплое → хаб (git-блок + markdown-вьюер) | deploy-client + server + hub |
| **И3** | фидбек/вопросы (стор + панель) | server backend + hub |
| **И4** | монитор v1 (profiler +Query/State/Logs collectors/панели + seam'ы) | owner-web-profiler/query, web-state, hub |
| **И5** | версии по ветке (`/<app>/<branch>/`, свитчер) | deploy + server + hub |
| **И6** | auto `data-testid` из meta + `--test` флаг + сид-моки | owner-web-core (UiProxy) + builders |
| **И7** | runtime-config (env/API-URL/роль на лету) | web-query/app-config + hub |
| **→** | чат, hot-reload, пакеты | отдельные ADR |

Порядок гибкий (И4/И6 — самые ценные для тестеров, можно раньше) — согласовать с пользователем.

## 5. И1 — детальный спец (первый пункт)

**Скелет хаба: каталог развёрнутых апп + iframe-воркспейс. Только это (без доков/фидбека/монитора).**

**5.1. Скаффолд (через CLI):**
- `node packages/cli/bin/capsule.mjs create-app testhub`.
- `apps/testhub/capsule.config.ts`: `base: '/'`, свой `devServerPort` (напр. 3100, чтобы не клэшить с ewc 3000).
- `apps/testhub/capsule.app.ts`: `api: () => ({ bases: { default: '/api' } })`.

**5.2. Слои (делегировать субагентам):**
- **Entity `App`** — карточка каталога: `{ name: string, base: string, url: string, deployedAt: string | null }`.
- **Endpoint `apps.list()`** — `GET /api/apps` → `z.array(App.schema)`. Мок для dev через `__CAPSULE_MOCKS__`-паттерн (пара фейковых апп, напр. ewc); без моков → реальный `/api/apps`.
- **Feature `Catalog`** — на init тянет `services.api.apps.list()`, держит `list` + `selected` (выбранная апп); обрабатывает выбор апп.
- **View `AppList`** — сайдбар: список апп, клик по строке → выбор, подсветка выбранной.
- **View `AppFrame`** — `<iframe>` с `src` = url выбранной аппы; плейсхолдер если ничего не выбрано.
- **Widget `Workspace`** — layout: `AppList` (сайдбар) + `AppFrame` (основная область), завязан на `Catalog`.
- **Page** (корень) → `Workspace`.
- UI — примитивы `@capsuletech/web-ui` (Layout/Flex/List/Navigation).

**5.3. Серверная часть (`docker/preview-server/server.mjs`, shared-infra):**
- **root-app concept**: deploy с base `/` принимается и помечается как корневая/дефолтная апп. Раздача: `/api/*` → API; иначе longest-prefix по зарегистрированным **не-корневым** app-base; иначе → **root-app** (SPA-fallback на его index.html + ассеты). Inline-HTML лендинг убрать (root-app заменяет; если root-app ещё нет → короткий fallback-текст).
- `/api/apps` — **исключить** root-app (хаб не показывает сам себя).

**5.4. Deploy-клиент (`scripts/deploy-preview.mjs`):**
- Флаг **`--root`**: разрешает base `/` (сейчас base `/` отклоняется) и деплоит как root-app. Без `--root` обычные апп по-прежнему требуют непустой base.

**5.5. Верификация — ЛОКАЛЬНО:**
- Хаб-UI: `cd apps/testhub && capsule dev` — каталог рендерится (на моках), клик переключает iframe.
- Полный флоу: локальный preview-server (`DATA_DIR=./tmp/preview-i1 DEPLOY_TOKEN=test node docker/preview-server/server.mjs`) → задеплоить ewc (обычный, `--mocks`) и хаб (`--root`) → открыть `http://localhost:<port>/` → хаб отдаётся в корне, в каталоге есть ewc, клик грузит ewc в iframe.
- **На боевой сервер не деплоить.**
- commit/PR И1.

## 6. Gotchas / конвенции

- **Workspace-апп читают собранный `dist` пакетов `@capsuletech/*`, не `src`.** После любой framework-правки — `pnpm --filter @capsuletech/<pkg> build` и рестарт dev-сервера. Новые subpath-экспорты/deps тоже требуют рестарта.
- **iframe-изоляция** — единственный корректный способ держать несколько capsule-апп на странице (синглтон-роутер + глобал-реестр).
- **Mocks-паттерн для dev** — `__CAPSULE_MOCKS__ ? handler : undefined` (как в `apps/ewc/src/endpoints/`), чтобы `capsule dev` показывал каталог без сервера.
- **CLI бинарь** дёргается из workspace: `node packages/cli/bin/capsule.mjs <cmd>` (apps/*/project.json так и делают — намеренно).
- **PR title** — lowercase, conventional (`feat:`/`fix:`/`docs:`), не начинать с `@`/цифр/uppercase (semantic-title hook).
- **Smoke перед релизом фреймворка** — `pnpm test:e2e:cli` (если трогали CLI/builders).
