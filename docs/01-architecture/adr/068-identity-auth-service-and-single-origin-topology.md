---
tags: [adr, accepted, backend, auth, identity, sso, topology, gateway, deployment]
status: accepted
date: 2026-07-03
last_updated: 2026-07-03
supersedes: []
extends:
  - 054-multi-language-platform
  - 067-backend-capability-services-lang-voice
---

> [!info] Status: accepted
> Единая identity для экосистемы: capability-сервис **`backend/auth`** (users + identities + sessions), сессия = **httpOnly-кука** (не JWT/localStorage), синк статуса между открытыми аппами = **BroadcastChannel** (не WebSocket), инвариант **«все фронты — один origin»** + dev-prod parity через локальный gateway. Auth-UI — отдельный апп (standalone + web-remote embed). Community/хаб строятся ПОВЕРХ (следующие ADR), это ADR только про identity.

# ADR 068 — Identity: `backend/auth`, single-origin топология, dev-prod parity

## Контекст {#context}

Экосистема растёт (studio, learn, дальше хаб + community-«мини-соцсеть»). Нужен **один аккаунт на всё**: любой апп доступен без регистрации (роль guest, ограничения через `web-access` capabilities), полный доступ — после входа; регистрация доступна **из любого аппа**. Вход должен уметь интеграции (телеграм-бот, внешние API) без перестройки ядра. UX-требование: логаут в одном аппе мгновенно видят все открытые аппы.

## Решение {#decision}

### D1 — `backend/auth`: capability-сервис identity {#d1}

`backend/auth` (`backend-auth`, порт **:8004**, Python 3.12+/FastAPI/uv — стек ADR 067). Владеет учётками и сессиями; **не знает** про домены аппов (роль guest/member — его, баллы/рейтинг/бан — домен community, НЕ сюда). Публичен, как lang/voice.

### D2 — Схема: users + identities + sessions {#d2}

- **`users`** — ядро аккаунта: `id, login (unique), role (member|admin), created_at`.
- **`identities`** — способы входа, ось-стратегия: `user_id, provider, external_id (unique per provider), secret_hash?`. Регистрация «через нас» = `provider='credentials'`; телеграм = `provider='telegram', external_id=tg_user_id`; будущий OAuth = ещё строки. Один юзер — много identity; новый способ входа = **аддитивная** строка, ядро не трогается.
- **`sessions`** — `id, user_id, token_hash, created_at, expires_at, last_seen`. В БД хранится **хэш** токена (утечка БД ≠ угон сессий). Ревокация = удаление строки.

Контракт (fixed): `POST /auth/register {login,password}` → 201 + Set-Cookie · `POST /auth/login` → 200 + Set-Cookie · `POST /auth/logout` → 204 + ревокация + сброс куки · `GET /auth/me` → 200 `{id, login, role}` | 401 (= guest).

### D3 — Сессия: httpOnly-кука с opaque-токеном {#d3}

**Не JWT-в-localStorage.** Кука `capsule_session`: `httpOnly` (XSS не уносит токен — критично при будущем UGC), `SameSite=Lax`, `Secure` в prod, TTL ~30d. Opaque-токен → серверная ревокация мгновенна (бан/логаут-везде). Кука скоупится на **хост без порта** (RFC 6265) → в dev едет между всеми портами localhost, в prod — за общим доменом. Фронты токен не видят и не возят; домен-сервисы проверяют сессию у auth; capability-сервисы (lang/voice) на старте остаются публичными.

### D4 — Синк статуса: BroadcastChannel, НЕ WebSocket {#d4}

«Залогинен ли» — **свойство запроса, не событие**: апп при загрузке зовёт `GET /auth/me`.

- **Тот же браузер, все вкладки/аппы:** сторона, совершившая login/logout, шлёт `BroadcastChannel('capsule-auth')` → все открытые аппы перечитывают `/me`. Мгновенно, ноль бэкенда.
- **Другое устройство / бан:** серверная ревокация → следующий запрос = 401 → апп падает в guest.

**WebSocket-push для auth отклонён**: «бэк знает все открытые аппы» = presence-инфраструктура (reconnect/heartbeat/состояние) без выгоды сверх схемы выше. Realtime-канал появится с community (чат/live-лента) — auth-события смогут ездить по нему бонусом, строить его ради auth — нет.

### D5 — Инвариант «все фронты — один origin» + деплой {#d5}

BroadcastChannel строго per-origin ⇒ **все фронтовые аппы живут на одном origin** (prod: `example.com/learn`, `/studio`, `/community` за reverse-proxy). Бэки: дефолт старта — **path** (`/api/auth`, `/api/learn`, …: same-origin, ноль CORS); допустимый апгрейд — **`api.`-поддомен** (кука `Domain=.example.com` — поддомены один site, SameSite=Lax живёт; + CORS c credentials). Гибрид «фронты на домене, бэки на поддомене» — штатный, инвариант касается только фронтов.

### D6 — Dev-prod parity: локальный gateway {#d6}

В dev аппы на портах = разные origin'ы = BroadcastChannel между аппами **молча мёртв** → класс багов «в dev работает, на серваке нет» (и наоборот). Решение — **dev-gateway** (nginx в docker), зеркалящий prod-роутинг: `localhost:8080/learn → :3100`, `/studio → :3050`, `/api/auth → :8004`, `/api/learn → :8003`, … (+ WebSocket-upgrade для Vite HMR). Аппы получают `base` в `capsule.config.ts` (`'/learn/'` — механизм готов, ewc-прецедент, прокидывается в роутер). Основной dev-флоу — через gateway; прямые порты остаются для точечной отладки.

### D7 — Auth-UI: отдельный апп, standalone + remote {#d7}

`apps/auth` — формы входа/регистрации на `@capsuletech/web-auth` (стратегии-оси, auth-FSM, `onLogin/onLogout` events). Работает standalone И монтируется в любой апп через web-remote (второй боевой потребитель remote после канваса). Аппы ловят `onLogin/onLogout` root-Feature'ой (флоу уже обкатан на playground mock-auth — mock заменяется на реальный клиент).

## Фазы {#phases}

1. **Identity-ядро:** `backend/auth` (D1-D3, credentials) + dev-gateway (D6) + пилот learn: guest/member через web-access, BroadcastChannel-синк, `apps/auth` минимальные формы.
2. **Телеграм-identity** (через `backend/telegram`) + хаб-заготовка.
3. **OAuth-провайдеры** (по потребности) + realtime с community.

## Последствия {#consequences}

**Плюсы:** один аккаунт на экосистему; вход из любого аппа; интеграции аддитивны (identities-ось); XSS-стойкая сессия с мгновенной ревокацией; логаут-синк без серверной инфры; dev ловит origin-баги до прода.

**Цена:** +1 сервис и fence-зона; dev-gateway = новый инфра-артефакт (docker) и `base` у аппов; строгий инвариант одного origin для фронтов (поддомены фронтов = осознанное отступление с заменой синк-механизма).
