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
`onLogin`/`onLogout`/`onLoginError` (ADR 032, `useEmit`).

**В аппе:** роутинг (login-роут, post-login, route-guards), маппинг роль→права,
брендинг/копирайт формы, выбор стратегии(й) + конфиг, backend endpoint `/auth/login`.

## Публичный API (subpaths)

| Subpath | Статус | Что |
|---|---|---|
| `.` | ready | barrel: types + session |
| `/role` | **ready** | `IRoleInput`, `roleStrategy(config)`, `loginRequestSchema`/`loginResponseSchema` |
| `/credentials` | stub | `ICredentialsInput`, `credentialsStrategy` (TODO) |
| `/oauth2` | stub | `IOAuth2Input`, `oauth2Strategy` (TODO) |
| `/qr` | stub | `IQrInput`, `qrStrategy` (TODO) |
| `/session` | **ready** | `createAuthSession`, `useAuth()`, `ITokenStorage`, `memoryStorage`, `localStorageStorage`, `defaultAuthSession` |
| `/controllers` | **ready** | `AuthController` FSM (idle→submitting→authed/error), phantom `__events`, EmitProbe pattern |
| `/ui` | **ready** | `AuthLoginForm` — web-core `View<IAuthLoginFormProps>` (strategy.fields → Select/Input/Button; Ui от View-wrapper, не проп) |
| `/capsule` | **ready** | `defineCapsuleModule({ name:'Auth', components:{LoginForm}, controllers:{Auth} })` |

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

52 тестов (vitest jsdom), все green:
- `controllers/__tests__/authController.test.tsx` — FSM schema (idle/submitting/authed/error), emit onLogin/onLoginError/onLogout, phantom __events, render/children; error-state: store.update(errorMessage), clear-on-input/onChange, mapAuthError маппинг (401/network/default).
- `session/__tests__/session.test.ts` — createAuthSession, login/logout/setStatus, useAuth reads, ITokenStorage impls (memory/localStorage).
- `role/__tests__/roleStrategy.test.ts` — roleStrategy fields/defaults, кастомные роли, zod-схемы (loginRequestSchema/loginResponseSchema).

## Roadmap

- [x] Skeleton: configs + subpath-блоки + регистрация путей/exclude (главный, bootstrap)
- [x] `/session` — `createAuthSession`, `useAuth()`, `ITokenStorage` (memory/localStorage), `defaultAuthSession`
- [x] `/role` — `roleStrategy(config)`, `loginRequestSchema`/`loginResponseSchema`, `IAuthFormField`
- [x] `/controllers` — `AuthController` (generic FSM, EmitProbe + useEmit) + регистрация в capsule.ts
- [x] `/ui` — `AuthLoginForm` config-driven на web-ui
- [ ] добавить в `nx.json` web_base group (через главного, при releasable-контенте)
- [ ] `/credentials`, `/oauth2`, `/qr` — итерациями
- [ ] `docs/_meta/web-auth.md` AI-anchor + user-guide
