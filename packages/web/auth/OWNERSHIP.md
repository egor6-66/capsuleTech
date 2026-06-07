# OWNERSHIP — @capsuletech/web-auth

**Owner agent:** `owner-web-auth`
**Package path:** `packages/web/auth/`
**Release group:** `web_base` (tag `web@{version}`) — **добавить в `nx.json` при первом releasable-контенте** (сейчас skeleton НЕ в группе, прецедент web-agent).
**Status:** `0.0.0` — skeleton (контракты + TODO). Наполнение блоков — owner.
**ADR:** [[039-web-auth-package|ADR 039]] (auth domain-пакет)

## Зона ответственности

Домен **auth** как переиспользуемый пакет: апп берёт блоки по subpath'ам и
параметризует **осью стратегии входа**. Логика (FSM) + UI (form-блоки) внутри
пакета; апп = роутинг + роль→права + брендинг + выбор стратегии + конфиг.

Зеркало экосистемного паттерна (Matrix→web-shell, DataTable→web-table; ADR 033)
и осевой параметризации (web-agent: транспорт/тулсет/персона; ADR 035).

## Ось стратегии (архитектурное правило)

| Стратегия | Subpath | Что задаёт |
|---|---|---|
| **По роли** | `/role` | вход по роли (developer/support/…) — **стартовая**, по playground-прототипу |
| **Логин+пароль** | `/credentials` | классический login/password |
| **OAuth 2.0** | `/oauth2` | redirect/PKCE через провайдера |
| **QR-код** | `/qr` | polling за подтверждением скана |

Каждая стратегия = свой блок: endpoint-контракт + auth-FSM-конфиг + config-driven
form-блок. Апп подключает нужные. Auth-FSM (`idle → submitting → authed/error`) —
**generic, не дублируется** на стратегию (живёт в `/controllers`, параметризуется).

## Граница пакет ↔ апп (ADR 039 §3)

**В пакете:** стратегии (`/role`…), generic auth-FSM, form-блоки (web-ui,
config-driven), session + `useAuth()`, Controllers + ИМЕНОВАННЫЕ события
`onLogin`/`onLogout`/`onError` (ADR 032, `useEmit`).

**В аппе:** роутинг (login-роут, post-login, route-guards), маппинг роль→права,
брендинг/копирайт формы, выбор стратегии(й) + конфиг, backend endpoint `/auth/login`.

## Публичный API (subpaths)

| Subpath | Статус | Что |
|---|---|---|
| `.` | stub | barrel: types + session (стратегии/ui/controllers — отдельными subpath'ами) |
| `/role` | stub | `IRoleInput`, `roleStrategy` (TODO). Стартовая стратегия |
| `/credentials` | stub | `ICredentialsInput`, `credentialsStrategy` (TODO) |
| `/oauth2` | stub | `IOAuth2Input`, `oauth2Strategy` (TODO) |
| `/qr` | stub | `IQrInput`, `qrStrategy` (TODO) |
| `/session` | stub | `IAuthSession`, `emptySession`, `useAuth()` (TODO) |
| `/controllers` | empty | `Controllers.Auth` FSM через `useEmit` (ADR 032). Единственный subpath с `web-core`-dep |
| `/ui` | empty | form-блоки на `@capsuletech/web-ui` (config-driven). Headless НЕ подключает |
| `/capsule` | stub | `defineCapsuleModule({ name: 'Auth', … })` (ADR 033). components/controllers — TODO |

## Моки — `preRequest` + `gen` (НЕ MSW)

⚠️ ADR 039 §4 написан до пивота: **MSW отменён** (ADR 038 superseded
[[040-data-gen-utility|ADR 040]]). Актуально: пакет даёт **чистый** контракт
`/auth/login` (без мок-веток); апп мокает через `preRequest` в endpoint'е,
данные — из `@capsuletech/shared-zod/gen` (`gen(responseSchema)`). Никакого
`__CAPSULE_MOCKS__`/inline-словарей.

## Старт / миграция

Первая волна — стратегия `/role` по **playground-прототипу** (UNTRACKED):
`apps/playground/src/features/auth` + `endpoints/auth` + `views/authForm`
(Select-роль/Input/Button, пароль '123', bento) → промоут в пакет:
- form-View → `/ui` form-блок (config-driven по `roleStrategy.fields`);
- features/auth FSM → `Controllers.Auth` (generic, параметризован роль-стратегией);
- endpoint-контракт → `/role` + чистый `/auth/login`; мок → app `preRequest` + `gen`;
- тонкая app-обвязка остаётся в playground (routing/rights/branding).
`/credentials`, `/oauth2`, `/qr` — следующими итерациями.

## Известные ограничения / quirks

1. **Multi-entry vite build** — все 9 subpaths обязаны быть в dist. `/controllers`
   и `/ui` пустые → warning «empty chunk», это ОК для skeleton.
2. **`/ui` тянет UI-зависимости** — не импортировать в headless-bundle.
3. **`/controllers` зависит на `web-core`** — остальные блоки framework-agnostic.
4. **Air-gapped** — никаких внешних URL по умолчанию (oauth2-провайдер/redirect —
   config-driven props аппа, не хардкод).
5. **`build` перед dev** — workspace-апп читают `dist` пакетов, не `src`. После
   правок — `pnpm --filter @capsuletech/web-auth build` + рестарт dev. Новые
   subpath-экспорты/deps требуют рестарта.
6. **Имя глобала 'Auth'** — не JS-builtin (ок). Не переименовывать в Map/Set/…

## Тест-покрытие

Пока нет (skeleton). Owner добавляет при наполнении:
- `controllers/__tests__` — AuthController FSM-переходы + emit событий (jsdom).
- `session/__tests__` — useAuth чтение роли/статуса.
- `role/__tests__` — резолв стратегии + form-конфиг.

## Roadmap

- [x] Skeleton: configs + subpath-блоки + регистрация путей/exclude (главный, bootstrap)
- [ ] `/session` — session-store (web-state) + `useAuth()`
- [ ] `/role` — roleStrategy + form-конфиг (миграция playground)
- [ ] `/controllers` — AuthController (generic FSM, useEmit) + регистрация в capsule.ts
- [ ] `/ui` — config-driven LoginForm-блок на web-ui
- [ ] добавить в `nx.json` web_base group (через главного, при releasable-контенте)
- [ ] `/credentials`, `/oauth2`, `/qr` — итерациями
- [ ] `docs/_meta/web-auth.md` AI-anchor + user-guide
