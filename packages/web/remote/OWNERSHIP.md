---
name: "@capsuletech/web-remote"
owner-agent: owner-web-remote
group: web_base
zone: runtime
status: scaffold
priority: P3
last-updated: 2026-06-11
---

# @capsuletech/web-remote

Динамическая загрузка независимо собранных удалённых модулей в host-приложение — собственный runtime (без `@module-federation/*`), pluggable transport-слой, reactive registry.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — module federation alternative.
- **Status:** `scaffold` (0.0.0) — Phase 0: type contracts, runtime пуст.
- **Priority:** **P3** — нужен только для micro-frontend сценариев.
- **Maturity bar (до alpha):**
  - Provider / useRemote / `<Remote>` impl.
  - Transports: local + BroadcastChannel + postMessage + socket.
  - RemoteManifestPlugin.
  - openInWindow integration.
- **Active blockers:** ждёт окончательного канона + потребности у apps.
- **Roadmap:**
  1. Provider + useRemote + `<Remote>` MVP.
  2. local transport.
  3. BroadcastChannel transport.
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/

Leaf-пакет zone runtime. Контракт в ADR 015. Никаких external module-federation вендоров — собственный runtime.

## Зона ответственности

### Owns

- `packages/web/remote/src/` (полностью) — типы, runtime, транспорты, provider, компоненты
- `packages/web/remote/package.json` exports / deps / peerDeps
- `packages/web/remote/vite.config.mts`
- `packages/web/remote/vitest.config.ts`
- `packages/web/remote/tsconfig*.json`
- `packages/web/remote/README.md`

### Не трогает

- Содержимое других `@capsuletech/*` пакетов (делегировать соответствующему owner'у).
- `packages/web/router/*` — Phase 2 требует добавления `openInWindow` в `routerService`; координировать с `owner-web-router`.
- `packages/web/core/*` — Phase 5 потенциально нужен service-inject в Widget/Feature; координировать с `owner-web-core`.
- `packages/builders/*` — Phase 4 нужен `RemoteManifestPlugin` в vite-builder и compliance-rule для Phase 5; координировать с `owner-builders`.
- `backend/*` — Phase 4 нужен Rust crate `backend/mf-bus/`; вне зоны, эскалировать пользователю.
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- `scripts/release-local.mjs` и другие shared infra (главный assistant).

## Публичный API

Единственный entrypoint `.` (`packages/web/remote/src/index.ts` → `dist/index.mjs`).

**Phase 0 — только type-contracts (runtime не реализован):**

| Экспорт | Тип | Описание |
|---|---|---|
| `IRemoteModuleConfig` | interface | Конфигурация одного удалённого модуля (`name`, `url`, `props?`, `standaloneUrl?`) |
| `IRemoteProviderProps` | interface | Props `<RemoteProvider>` (`serverUrl?`, `modules`, `children?`) |
| `IRemoteContext` | interface | Контекст `useRemote()` — `Remote`, `remote`, `updateModule`, `modules` |
| `IRemoteHandle` | interface | Per-instance handle: `send`, `request`, `on`, `openStandalone` |
| `IRemoteResponse<T>` | interface | Ответ на request/response round-trip (`status`, `payload?`, `error?`) |
| `IRemoteComponentProps` | interface | Props компонента `<Remote>` (`name`, `instanceId?`, `fallback?`, `...rest`) |
| `IRemoteManifest` | interface | Манифест удалённого модуля (`name`, `version`, `entry`, `styles?`, `props?`, `events?`) |
| `IRemoteMessage` | interface | Envelope для всех транспортов; ключ маршрутизации `(to, toInstance, sessionId)` |
| `ITransport` | interface | Pluggable transport contract (`kind`, `canReach`, `send`, `onMessage`, `dispose`) |
| `TransportKind` | type | `'local' \| 'broadcast-channel' \| 'post-message' \| 'socket'` |

Авторитативный design doc: `docs/01-architecture/adr/015-remote-modules.md` (status: proposed).

**Изменение публичного API = breaking change → координация с главным.** Любое удаление экспорта — major-bump + согласование с пользователем. Добавление новых полей должно быть breaking-friendly (optional).

**Runtime реализуется поэтапно (см. Roadmap ниже).**

## Quirks / gotchas

- **`@module-federation/*` не используется намеренно.** Reference (PROTEI) тянет MF 2.0, под Solid не тестировано и имеет проблемы с multi-instance. Собственный runtime через `import(url)` + manifest — осознанный выбор (ADR-015 «Альтернативы»).
- **`instanceId` обязателен как часть routing-key.** `(to, toInstance, sessionId)` — неделимый ключ. Два standalone одного модуля в одной сессии = 2 разных endpoint'а. Нельзя делать `instanceId` необязательным для маршрутизации — это закрывает провал multi-instance референс-реализации.
- **`updateModule(name, { url: newUrl })` должно forcibly remount всех instance'ов этого `name`.** Это part of Phase 1 contract; должно быть покрыто тестом.
- **socket.io обязателен только для cross-origin standalone + cross-device.** Same-window (`local`) и same-origin multi-window (`BroadcastChannel`) работают без сервера. Не делать socket обязательным.
- **Standalone-окно через `routerService`, НЕ `window.open(url + ?queryString)`.** Query-string теряет `opener` после refresh; route с typed params через TanStack Router — правильный путь (Phase 2).
- **CORS requirements.** Manifest-fetch (`capsule.manifest.json`) и ESM `import()` должны идти с правильным CORS на стороне remote-сервера. Документировать в user-guide при Phase 4.
- **Phase 0 — runtime пуст.** `dist/` содержит только type declarations. Компоненты `<RemoteProvider>`, `<Remote>`, хук `useRemote()`, транспорты — не реализованы. Любой runtime-импорт до Phase 1 упадёт в рантайме.
- **Пакет не в release-группах `nx.json`.** Version `0.0.0`, релизы включатся после Phase 4. Не запускать `pnpm publish` без согласования с пользователем.

## План рефакторинга / оптимизаций

- [ ] **Phase 1 — LocalTransport + Provider + Remote + useRemote** — embedded transport (`local`), `<RemoteProvider>`, `<Remote>`, `useRemote()`. Demo в новом app. Smoke без сервера, same-window only. (priority: high)
- [ ] **Phase 2 — BroadcastChannel transport + standalone-window** — `BroadcastChannel` transport, same-origin multi-window. `routerService.openInWindow` через `owner-web-router`. (priority: high)
- [ ] **Phase 3 — post-message transport** — cross-origin, same-device, через iframe и/или `window.opener`. (priority: medium)
- [ ] **Phase 4 — socket transport + RemoteManifestPlugin** — `socket` transport, backend `mf-bus/` Rust crate. `RemoteManifestPlugin` для билда remote-модулей. Manifest-driven props/events типизация. (priority: medium)
- [ ] **Phase 5 — Compliance rule** — запрет `@capsuletech/web-remote` в Controller/Entity через `@capsuletech/compliance`. Координировать с `owner-builders`. (priority: low)
- [x] **Phase 0 — type-contracts skeleton** — `src/interfaces.ts` (175 строк), `src/index.ts` barrel, package scaffold. PR #77, merged 2026-05-19.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | — | Нет (Phase 0, только типы) |
| Integration | — | Нет |
| E2E | — | Нет |

**Phase 0 — тестов нет, тестировать нечего (только type declarations).**

План по фазам:

- **Phase 1:** pure-helpers (URL resolution, session-key derivation) — vitest node; `LocalTransport` — pure JS, node; `<RemoteProvider>` + `useRemote()` — jsdom + Solid render (аналогично UiProxy-тестам в `packages/web/core`).
- **Phase 2:** `BroadcastChannel` — jsdom поддерживает; mock в node.
- **Phase 3:** `postMessage` cross-frame — Playwright (multi-frame); pure-message-routing — unit.
- **Phase 4:** `socket` — mock socket.io клиент в node. Server-side — в Rust crate отдельно.

**Перед изменением (Phase 1+):** unit-tests должны быть green (`pnpm --filter @capsuletech/web-remote test`).
**При breaking change:** обновить tests + добавить новые для contract.
**Перед release:** `pnpm test:e2e:cli` обязателен.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `routerService.openInWindow` (Phase 2) | owner-web-router |
| Service injection в Widget/Feature (Phase 5) | owner-web-core |
| `RemoteManifestPlugin` в vite-builder (Phase 4) | owner-builders |
| Compliance rule `no-remote-in-controller` (Phase 5) | owner-builders |
| Socket-server Rust crate `backend/mf-bus/` (Phase 4) | эскалировать пользователю |

## Release group

Пакет **не включён** ни в одну release-группу `nx.json` — Phase 0 (version `0.0.0`).

Релизы включатся после стабилизации Phase 4 (RemoteManifestPlugin + Compliance rule). При включении — отдельная группа `remote` (собственный темп релизов, не `web_base`). Финальное решение согласовать с пользователем.

После изменений — координировать release через главного.
