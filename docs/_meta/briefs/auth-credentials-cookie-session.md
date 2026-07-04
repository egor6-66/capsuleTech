---
title: web-auth — credentials-стратегия на backend/auth + session v2 (httpOnly-кука, НЕ token)
status: ready
audience: owner-сессия `claude-scope -Scope auth` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [032, 033, 068]
---

# Контекст

`backend/auth` готов и зелёный (9 pytest): `POST /auth/register|login` → Set-Cookie
`capsule_session` (httpOnly, SameSite=Lax, TTL 30d), `POST /auth/logout` → ревокация,
`GET /auth/me` → `{id, login, role}` | 401 (= guest). Gateway маршрутизирует
`/api/auth/<rest>` → `:8004/auth/<rest>`. Канон single-origin: apiBase = `'/api'`
(одинаков dev/prod — контракт, не хардкод; прецедент learn `4454e13f`).

**🔴 КОРНЕВОЙ КОНФЛИКТ — чиним причину, не наворачиваем сверху.** Текущая
session-модель пакета — token-центричная (`IAuthSession.token`, `ITokenStorage`,
`localSessionStorage`, персист токена в localStorage) — наследие playground
mock-эры. ADR 068 D3 прямо: **httpOnly-кука, фронты токен НЕ видят и НЕ возят**
(XSS-стойкость критична при будущем UGC community). Реализовать credentials
поверх token-модели = канон-violation. Session переводится на cookie-first (v2).

# Scope (packages/web/domain/auth)

## 1. Session v2 — cookie-first (breaking, лечим модель)

- `IAuthSession` → `{ user: IAuthUser | null; status: AuthStatus }` — поле `token`
  УДАЛИТЬ из модели. Персистентность сессии = сама кука + `GET /me`;
  `ITokenStorage`/`ISessionStorage`/`localSessionStorage`/`configureAuthSession`
  становятся не нужны для cookie-флоу — выпилить либо явно пометить
  `@deprecated` legacy-опорой role-mock-стратегии (решение owner'а, см. §5;
  НЕ оставлять молча как живой равноправный путь).
- `IAuthUser` выровнять на контракт бэка: `{ id: number; login: string; role: string }`
  (сейчас `id?/name?` — уточнить по факту, name у бэка нет).
- Bootstrap: `initAuthSession(apiBase?)` — один вызов при загрузке аппа:
  `GET /me` → 200 = authed(user), 401 = guest (status 'idle', user null).
  Guest — штатное состояние, не ошибка.
- `useAuth()` — API сохранить (`user/role/status/isAuthed`), `token` убрать.

## 2. Credentials-клиент (блок `/credentials`)

`register/login/logout/me` — `fetch('${apiBase}/auth/…', { credentials: 'same-origin' })`,
Zod-валидация ответов (shared-zod), типизированные ошибки (409 login taken /
401 invalid). apiBase — явный параметр с дефолтом `'/api'` (образец —
learn `library/api.ts`: store вне Solid-scope, контекст не читаем в модуле).

## 3. BroadcastChannel-синк (ADR 068 D4)

Канал `'capsule-auth'`: сторона, совершившая login/register/logout, постит
сообщение → слушатель у всех открытых аппов ре-фетчит `/me` и обновляет
session-store. SSR/Node-safe гард (`typeof BroadcastChannel !== 'undefined'`).
Смысл: логаут в одном аппе мгновенно виден всем вкладкам/аппам одного origin.

## 4. UI-блоки + события

- `Auth.Login` arm `type="credentials"`: поля login+password, submit →
  login-клиент → session.update + emit.
- Регистрация: форма login+password(+confirm) — отдельный блок `Auth.Register`
  или таб внутри Login — по вкусу owner'а на web-ui примитивах (config-driven,
  0 raw-class).
- События (ADR 032, phantom `__events`): `onLogin { user }` (БЕЗ token),
  `onLogout {}`, `onLoginError { message }`. `ILoginResponse.token` из types.ts
  убрать/переработать под UserOut.

## 5. Role-стратегия (playground mock) — НЕ ломать

Playground живёт на `type="role"` с preRequest-моком. Минимально адаптировать
под новую session-модель (роль без token'а). Если адаптация тянет за собой
большее — СТОП + surface architect'у, не молчаливый рефакторинг.

## 6. Тесты

session v2 (me-bootstrap 200/401, login/logout мутации), BroadcastChannel-синк
(мок канала), credentials-клиент (мок fetch: happy/401/409), формы (render+submit).
Обновить существующие session/controller-тесты под v2.

# Acceptance

- `pnpm --filter @capsuletech/web-auth test` зелёные; build чист; biome 0.
- Тесты playground не красные (`pnpm --filter @capsuletech/playground test`, если есть).
- OWNERSHIP.md: публичный API обновлён (breaking session v2 задокументирован).

# Что НЕ делаем

- oauth2/qr — заглушки как есть.
- web-remote embed форм — шаг 2 волны (отдельный бриф).
- Не перестраиваем subpath-раскладку пакета.
- Никакого хранения токена/сессии в localStorage — кука единственный носитель.
