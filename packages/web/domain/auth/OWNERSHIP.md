---
name: "@capsuletech/web-auth"
owner-agent: owner-web-auth
group: web_base
zone: domain
status: in-progress
priority: P1
last-updated: 2026-07-04
---

# OWNERSHIP — @capsuletech/web-auth

**Owner agent:** `owner-web-auth`
**Package path:** `packages/web/auth/`
**Release group:** `web_base` (tag `web@{version}`) — **добавить в `nx.json` при первом releasable-контенте** (сейчас skeleton НЕ в группе, прецедент web-agent).
**Status:** `0.0.0` — skeleton (контракты + TODO). Наполнение блоков — owner.
**ADR:** [[039-web-auth-package|ADR 039]] (auth domain-пакет)

## Состояние (читать ПЕРВЫМ)

- **Zone:** `domain` — stateful feature-package, «мини-апп как пакет». Параметризуется ОСЬЮ СТРАТЕГИИ ВХОДА через subpath'ы (`/role`, `/credentials`, `/oauth2`, `/qr`).
- **Status:** `in-progress` (0.0.0) — реализованы стратегии **role** (legacy mock) и **credentials** (cookie-флоу, backend/auth ADR 068); session **v2 cookie-first**; oauth2/qr — заглушки.
- **Priority:** **P1** — критичный для любого capsule-аппа с auth.
- **Maturity bar (до alpha):**
  - ✅ Реализованы минимум стратегии: role + credentials.
  - ✅ Generic auth FSM (idle → submitting → authed/error).
  - ✅ Named events (onLogin/onLogout/onLoginError) через handler-API `emit` (ADR 032).
  - ✅ Capsule manifest (ADR 033) для capability injection.
  - Контракт `IAuthCapability` extracted в `web-contract` (ADR 047 D2).
- **Active blockers:** ADR 047 D2 compliance не активирован, но canon зафиксирован [[web-zone-domain|domain zone canon]].
- **Roadmap:**
  1. ✅ Реализация role + credentials стратегий.
  2. Web-remote embed форм (шаг 2 волны auth-app, отдельный бриф).
  3. OAuth2 / QR стратегии.
  4. `IAuthCapability` контракт в `web-contract` (Phase D2).
- **Last activity:** 2026-07-04 (session v2 cookie-first + credentials-стратегия + Auth.Register + BroadcastChannel-синк, ADR 068).

## 🔴 Session v2 — cookie-first (BREAKING, 2026-07-04, ADR 068 D3)

Token-центричная модель v1 (`IAuthSession.token`, `ITokenStorage`,
`localStorageStorage`, `memoryStorage`, персист токена) — УДАЛЕНА. Носитель
сессии — httpOnly-кука `capsule_session` (backend/auth): фронт токен НЕ видит
и НЕ возит, все запросы `credentials: 'same-origin'`. Никакого localStorage
для cookie-флоу.

Breaking-изменения публичного API:
- `IAuthSession` = `{ user: IAuthUser | null; status: AuthStatus }` — поле `token` удалено.
- `IAuthSessionStore.login(user)` — сигнатура без token.
- `useAuth()` — `token` удалён из результата (`user/role/status/isAuthed` остались).
- `IAuthUser` = `{ id?: number; login?: string; role: string }` — выровнен на backend `UserOut`
  (`id`/`login` опциональны ТОЛЬКО из-за legacy role-mock; credentials заполняет всё). `name` удалён.
- `IAuthEvents.onLogin` = `{ user }` — БЕЗ token.
- `ILoginRequest`/`ILoginResponse` из types.ts удалены (мёртвые скелет-типы; контракт бэка — `userOutSchema`).
- Bootstrap: `initAuthSession(apiBase = '/api', store = defaultAuthSession)` — один вызов
  при загрузке аппа: `GET /auth/me` → 200 = authed(user), 401 = guest (idle, штатно).
  Также подписывает вкладку на BroadcastChannel-синк.

**Legacy (role-mock, playground) — жив, но помечен `@deprecated`:**
`ISessionStorage`/`IPersistedSession` (v2: персистится `{ user }`, без token)/
`localSessionStorage`/`configureAuthSession`. Их дёргает app-config-кодоген
(`auth.session: { storage: 'local', key }`) — сигнатуры сохранены. Для
cookie-флоу НЕ использовать. v1-записи в localStorage (`{token,user}`)
читаются: user извлекается, token отбрасывается.

**BroadcastChannel-синк (ADR 068 D4):** канал `'capsule-auth'`. login/register/
logout постят `{ type: 'auth-changed' }` → остальные вкладки/аппы origin
ре-фетчат `/me` и обновляют store. Один shared-instance канала на модуль → без
self-delivery. SSR/Node-safe guard.

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA wrappers + ControllerProxy.
- **`@capsuletech/web-state`** (workspace, dep) — `createState` для auth FSM.
- **`@capsuletech/web-query`** (workspace, dep) — `defineEndpoint` для `/auth/login` (clean contract; моки через app preRequest + shared-zod/gen, НЕ MSW).
- **`@capsuletech/web-ui`** (workspace, dep) — form-блоки (Field/Input/Button/...).
- **`@capsuletech/shared-zod`** (workspace, dep) — schema-validation.

## Allowed dependency zones (ADR 047 D2)

Domain-пакеты НЕ импортят друг друга напрямую. web-auth разрешено зависеть на:

- ✅ **kit** (`web-ui`)
- ✅ **runtime** (`web-core`, `web-state`, `web-query`, `web-style`, `shared-zod`)
- ✅ **boost** (если форма нуждается, например `boost-table` для списка ролей)
- ✅ **web-contract** (для cross-domain capability)
- ❌ **другой domain** (`web-shell`, `web-agent`) — через контракт в `web-contract`.

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
`onLogin`/`onLogout`/`onLoginError` (ADR 032, `useEmit`).

**В аппе:** роутинг (login-роут, post-login, route-guards), маппинг роль→права,
брендинг/копирайт формы, выбор стратегии(й) + конфиг, backend endpoint `/auth/login`.

## Публичный API (subpaths)

| Subpath | Статус | Что |
|---|---|---|
| `.` | ready | barrel: types + session |
| `/role` | **ready (legacy mock)** | `IRoleInput`, `roleStrategy(config)`, `loginRequestSchema`/`loginResponseSchema` (мок-контракт; token в ответе FSM игнорирует) |
| `/credentials` | **ready** | `credentialsStrategy(config?)`, `ICredentialsInput`, HTTP-клиент (`loginRequest`/`registerRequest`/`logoutRequest`/`meRequest`, `userOutSchema`), ошибки (`AuthApiError`/`InvalidCredentialsError` 401/`LoginTakenError` 409), `logoutCredentials(apiBase?)` — полный логаут (сервер + store + broadcast) |
| `/oauth2` | stub | `IOAuth2Input`, `oauth2Strategy` (TODO) |
| `/qr` | stub | `IQrInput`, `qrStrategy` (TODO) |
| `/session` | **ready (v2)** | `createAuthSession`, `useAuth()` (без token), `initAuthSession(apiBase?, store?)` — me-bootstrap + broadcast-подписка, `defaultAuthSession`, `notifyAuthChanged`/`onAuthChanged`/`AUTH_CHANNEL_NAME`; `@deprecated` legacy: `configureAuthSession`, `ISessionStorage`, `IPersistedSession`, `localSessionStorage` |
| `/controllers` | **ready** | `AuthLogin` (арм role + credentials), `AuthRegister` (login+password+confirm, client-side confirm-валидация), FSM idle→submitting→authed/error, phantom `__events` |
| `/ui` | **ready** | `AuthLoginForm` — web-core `View<IAuthLoginFormProps>` (`strategy: { fields }` — любой fields-носитель; Ui от View-wrapper, не проп). Register переиспользует её же (config-driven поля) |
| `/capsule` | **ready** | `defineCapsuleModule({ name:'Auth', components:{Login, Register} })` + `registerPackageServices('authApi', { init, logout, logoutServer, isAuthed, user })` — `init(apiBase?)` bootstrap cookie-сессии (initAuthSession: /me + broadcast-подписка; root-Feature аппа зовёт в onInit ДО чтения isAuthed), `logout` локальный (+broadcast), `logoutServer(apiBase?)` полный cookie-логаут |

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

## Error display + clear-on-input (Auth.Login контракт)

**Показ ошибки в форме (package-level):**
При переходе FSM в `error` (login failed) контроллер вызывает
`store.update({ errorMessage: '<дружелюбный текст>' })`. `AuthLoginForm` (View)
читает это через `useCtx().store.ctx.data.errorMessage` и рендерит
`Ui.Typography` с классом `text-destructive` под кнопкой submit.
`emit('onLoginError', { payload: { message: rawMessage } })` при этом сохраняется
(app-уровень тоже видит событие).

**Маппинг кодов ошибок (`mapAuthError`):**
- `401 / unauthorized / invalid / wrong / incorrect / password` → «Неверный логин или пароль»
- `network / fetch / connection / timeout / econnrefused` → «Не удалось подключиться к серверу»
- остальное → «Не удалось войти. Попробуйте ещё раз.»

`emit('onLoginError')` несёт оригинальный `rawMessage` (для app), форма — дружелюбный.

**Гашение ошибки при взаимодействии с формой:**
`error.onInput` и `error.onChange` → `store.update({ errorMessage: '' })` + `state.set('idle')`.
`error.onClick(submit)` — то же (retry через кнопку).
Таким образом, первое нажатие клавиши или изменение Select немедленно убирает
ошибку и возвращает форму в `idle` для повторного submit.

## Известные ограничения / quirks

1. **Multi-entry vite build** — все 9 subpaths обязаны быть в dist. `/controllers`
   и `/ui` пустые → warning «empty chunk», это ОК для skeleton.
2. **`/ui` тянет UI-зависимости** — не импортировать в headless-bundle. `AuthLoginForm` — web-core `View`, рендерится ВНУТРИ AuthFsm Controller-scope: UiProxy автоматически проксирует Ui под AuthFsm → `meta.tags` биндятся корректно.
   JSX inference quirk: `<Ui.Input meta={{ tags: [...] }}/>` внутри `fallback={}` пропа Solid's `Show` → TS видит `tags` как `never` из-за `IInputProps extends JSX.InputHTMLAttributes`. Обходится через `as any` на `meta`. Это TypeScript/JSX-fallback inference issue, не баг пакета.
3. **`/controllers` зависит на `web-core`** — остальные блоки framework-agnostic.
4. **Air-gapped** — никаких внешних URL по умолчанию (oauth2-провайдер/redirect —
   config-driven props аппа, не хардкод).
5. **`build` перед dev** — workspace-апп читают `dist` пакетов, не `src`. После
   правок — `pnpm --filter @capsuletech/web-auth build` + рестарт dev. Новые
   subpath-экспорты/deps требуют рестарта.
6. **Имя глобала 'Auth'** — не JS-builtin (ок). Не переименовывать в Map/Set/…
7. **Зарезервированные имена событий** — пакетные события (`IAuthEvents`) НЕ должны использовать имена, занятые web-core lifecycle/UiProxy:
   `onInit`, `onExit`, `onRegister`, `onDispose`, `onError`, `onClick`, `onDblClick`, `onInput`, `onChange`, `onBlur`, `onFocus`, `onKeyDown`.
   Пример: auth-пакет использует `onLoginError` (не `onError`) — именно по этой причине.

## Тест-покрытие

102 теста (vitest jsdom), все green:
- `__tests__/capsule.test.ts` — wiring services.authApi.init: регистрация под namespace, 200 → authed(user)+return user, 401 → null/guest, прокидывание apiBase (перехват registerPackageServices через vi.hoisted — getPackageServices internal в web-core).
- `api/__tests__/client.test.ts` — HTTP-клиент (мок fetch): credentials same-origin на каждом запросе, zod-валидация UserOut, apiBase-подстановка; login 200/401(InvalidCredentialsError)/500; register 201/409(LoginTakenError)/422; me 200/401→null/500; logout 204/500; невалидный payload → AuthApiError.
- `session/__tests__/session.test.ts` — session v2 (login(user)/logout/setStatus, БЕЗ token), useAuth v2, initAuthSession me-bootstrap (200 authed / 401 guest / 401 при authed → logout / network-fail → warn+null / кастомный apiBase); legacy localSessionStorage (`{user}` round-trip, v1-запись читается без token) + configureAuthSession.
- `session/__tests__/broadcast.test.ts` — канал 'capsule-auth' (fake BroadcastChannel): доставка между «вкладками», без self-delivery, отписка; интеграция initAuthSession: login/logout в другой вкладке → ре-фетч /me → store обновлён; повторный init не дублирует подписку.
- `credentials/__tests__/credentials.test.ts` — credentialsStrategy fields/defaults/labels; logoutCredentials (сервер ok / сервер down → локальный сброс всё равно).
- `controllers/__tests__/authController.test.tsx` — FSM schema, общая механика (idle/error clear-on-interaction); role-арм: onLogin `{user}` БЕЗ token (token мока игнорируется), mapAuthError (401/network/default); credentials-арм: loginRequest(payload, apiBase), typed-маппинг (401/сеть), loading-стейт @submit/@input; Auth.Register: confirm-mismatch без сети, 409 → «Логин уже занят», успех → session+emit; onLogout.
- `role/__tests__/roleStrategy.test.ts` — roleStrategy fields/defaults, кастомные роли, zod-схемы.

## Roadmap

- [x] Skeleton: configs + subpath-блоки + регистрация путей/exclude (главный, bootstrap)
- [x] `/session` v2 — cookie-first: `initAuthSession` (me-bootstrap), BroadcastChannel-синк (ADR 068 D3/D4)
- [x] `/role` — `roleStrategy(config)` (legacy mock-опора playground)
- [x] `/credentials` — стратегия + HTTP-клиент backend/auth + типизированные ошибки + `logoutCredentials`
- [x] `/controllers` — `AuthLogin` (role+credentials армы) + `AuthRegister` + регистрация в capsule.ts
- [x] `/ui` — `AuthLoginForm` config-driven на web-ui (переиспользуется Register'ом)
- [ ] добавить в `nx.json` web_base group (через главного, при releasable-контенте)
- [ ] web-remote embed форм (шаг 2 волны auth-app, отдельный бриф)
- [ ] `/oauth2`, `/qr` — итерациями
- [ ] `docs/_meta/web-auth.md` AI-anchor + user-guide
