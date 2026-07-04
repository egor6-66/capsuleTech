# Auth-флоу: кто что делает (ADR 068, волна 2026-07-04)

Карта всех методов цепочки. Читается сверху вниз = от браузера к БД.

## 0. Топология

```
браузер (один origin :8080, dev-gateway)
  /auth/          → apps/auth (Vite :3200)      — UI входа
  /learn/ …       → остальные фронты
  /api/auth/*     → backend/auth :8004          — identity-сервис
  /api/learn|lang|voice/* → capability-сервисы  — ПУБЛИЧНЫ, сессию не проверяют
```

## 1. backend/auth (:8004) — владелец учёток и сессий

| Метод | Что делает | Ответ |
|---|---|---|
| `POST /auth/register {login,password}` | создаёт user + identity(credentials, argon2-hash) + session; ставит куку | 201 `{id,login,role}` / 409 login taken |
| `POST /auth/login {login,password}` | проверяет пароль, создаёт session, ставит куку | 200 UserOut / 401 |
| `POST /auth/logout` | удаляет session-строку (ревокация), сбрасывает куку | 204 |
| `GET /auth/me` | резолвит куку → user | 200 UserOut / **401 = guest (штатно)** |

**Кука `capsule_session`**: httpOnly (JS её НЕ видит — это норма, не баг), SameSite=Lax,
path=/, TTL 30d, скоуп — хост `localhost` без порта. В БД хранится хэш токена;
логаут/бан = удаление строки → мгновенная ревокация.

## 2. Пакет @capsuletech/web-auth — фронтовая обвязка

| Слой | Метод | Кто зовёт | Что делает |
|---|---|---|---|
| `api/client` (приватный) | `registerRequest/loginRequest/logoutRequest/meRequest` | блоки пакета | fetch `/api/auth/*` c `credentials:'same-origin'` (кука едет автоматически), zod-валидация UserOut |
| `/session` | `initAuthSession(apiBase?)` | `authApi.init` | bootstrap: GET /me → store authed либо guest + подписка на broadcast |
| | `useAuth()` | любой слой | реактивно `{user, role, status, isAuthed}` |
| `/session` broadcast | `notifyAuthChanged()` / `onAuthChanged(cb)` | пакет сам | BroadcastChannel `'capsule-auth'`: login/logout в одной вкладке → все вкладки ре-фетчат /me |
| `/credentials` | `credentialsStrategy`, `logoutCredentials` | FSM блоков | связка client ↔ session ↔ broadcast |
| блоки | `Auth.Login type="credentials"`, `Auth.Register` | аппы (глобалы) | формы; успех → session.update + emit |
| события (ADR 032) | `onLogin {user}`, `onLogout`, `onLoginError {message}` | ловит фича аппа | payload БЕЗ токена |

## 3. services.authApi — как апп говорит с пакетом БЕЗ импортов

Канон `<pkg>Api` (CLAUDE.md §сигнатуры: `Feature(({ router, utils, ...pkgApi }))`,
механика ADR 032/039): пакет на bootstrap регистрирует свой runtime-API через
`registerPackageServices('authApi', …)` → он появляется в services **каждой**
Feature/Controller аппа, подключившего пакет. Отличие от `api`:
- `api` — HTTP-клиент web-query по endpoint'ам АППА (`src/endpoints/*`);
- `authApi` — runtime-API ПАКЕТА (session-store, не сеть).

| Метод | Что делает |
|---|---|
| `authApi.init(apiBase?)` | bootstrap сессии (см. §2), root-Feature зовёт в onInit ДО isAuthed() |
| `authApi.isAuthed()` / `user()` | реактивное чтение сессии |
| `authApi.logoutServer()` | POST /logout (ревокация) + сброс store + broadcast |
| `authApi.logout()` | только локальный сброс (без сервера) — для мок-флоу |

## 4. apps/auth — UI-оркестрация

`guest.onInit`: `await authApi.init()` → isAuthed → authed-панель. `onLogin`:
редирект по `?next=` (только same-origin path, open-redirect guard) через
`location.assign` (другой апп = другой SPA). `logout`-кнопка → `authApi.logoutServer()`.

## 5. Как «остальные» узнают юзера

- **Фронты** (learn и др.): подключают web-auth → `authApi.init()` в root-фиче →
  `useAuth()/isAuthed()`; guest/member-ограничения — web-access (пилот learn, next).
- **Бэки-capability** (learn/lang/voice): сейчас ПУБЛИЧНЫ — им не нужен юзер.
  Когда появится персональный домен (progress, community) — сервис резолвит куку
  **внутренним вызовом к auth** (service-to-service `/auth/me`-класс), сам паролей
  не знает. Это следующая фаза, шов заложен в ADR 068 D3.

## 6. Проверить куку руками (dev)

1. Логиниться ТОЛЬКО через `:8080/auth/` (на прямом `:3200` /api не работает до
   vite-builder apiProxy — логин там молча падает и куки не будет).
2. DevTools → Application → Cookies → `http://localhost:8080` → строка
   `capsule_session` (HttpOnly ✓). В `document.cookie` её НЕ видно — так задумано.
3. Network → любой запрос на `/api/…` → Request Headers → `Cookie: capsule_session=…`.
   Браузер шлёт её сам (fetch same-origin default) — в коде фронтов куки нет нигде.
4. `/api/learn/*` запросы тоже несут куку, но learn её игнорирует (публичен, §5).
