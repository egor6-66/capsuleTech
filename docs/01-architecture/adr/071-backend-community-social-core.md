---
tags: [adr, accepted, backend, community, social, events, storage, chat]
status: accepted
date: 2026-07-05
last_updated: 2026-07-05
supersedes: []
extends:
  - 068-identity-auth-service-and-single-origin-topology
  - 070-two-tier-deployment-light-vps-gpu-peer
---

> [!info] Status: accepted
> `backend/community` (:8006, Python/FastAPI) — соц-ядро экосистемы: 4 модуля
> **profile / events / posts / chat** в одном сервисе. Рейтинги/статистика =
> проекции append-only event-журнала (пишут ТОЛЬКО бэки приложений). Медиа —
> self-hosted **MinIO** (S3-протокол), в БД только ключи. Chat = WebSocket-hub
> (фаза 3), auth-события бонусом (ADR 068 D4). Первый потребитель шва
> «домен-сервис проверяет сессию у auth».

# ADR 071 — backend/community: соц-ядро (профиль, события, контент, чат)

## Контекст {#context}

User: мини-соцсеть с расчётом на полноценную — ЛК юзера (аватар/био/контакты),
рейтинги общие и per-app, вся статистика, посты/шаринг, чат. Identity готова
(ADR 068). Принципы согласованы заранее (2026-07-03): баллы = проекция
событий; агент-ревью юзер-контента = pluggable seam; realtime появляется
именно здесь.

## Решение {#decision}

### D1 — Один сервис, модульный внутри {#d1}

`backend/community` (:8006, py3.12/FastAPI/uv — стек ADR 067), модули
`profile/ events/ posts/ chat/` (образец — lang с lexical+lessons). Сервисы
не плодим; chat-hub изолирован модулем с первого дня — шов выделения в
отдельный сервис при реальной нагрузке (тогда же — Rust-опция). Живёт на
лёгком ярусе (ADR 070), GPU не нужен.

### D2 — Сессия: проверка у auth {#d2}

Community — первый «домен-сервис» ADR 068 D3: резолвит юзера, пробрасывая
куку запроса внутренним вызовом `auth GET /auth/me` (httpx, passthrough
Cookie). Паролей/токенов не знает. Guest = публичное чтение витрин; запись —
только member.

### D3 — Профиль {#d3}

Auth остаётся ядром identity (login/role); всё «человеческое» здесь:
`profiles(user_id PK, nick, bio, avatar_key, contacts jsonb, created_at)`.
`GET/PUT /community/profile` (своё), `GET /community/profiles/{id}`
(публичное — аватар в шапке любого аппа тянется отсюда).

### D4 — Event-store: append-only журнал, статистика = проекции {#d4}

`events(id, user_id, source_app, kind, payload jsonb, ts)` — только INSERT.
Рейтинги (общий, per-app), баллы, статистика ЛК — **проекции** над журналом
(SQL-агрегаты; materialized по мере роста). Новая метрика = новая проекция по
уже накопленной истории, ноль миграций данных. **Пишут только бэки приложений**
(server-to-server; фронты никогда — канон «фронт = интерфейс»). Первый
поставщик — learn-BFF (события дриллов из Exercises; фаза 3 ADR 069 садится
сюда же). Внутренний канал: на старте отдельный порт-байндинг/внутренний
префикс НЕ публикуется через gateway; shared-secret заголовок как минимальный
гейт (двухъярусность ADR 070: межсервисный трафик ходит по WG/localhost).

### D5 — Контент и медиа {#d5}

`posts / comments / reactions`; лента MVP = reverse-chron. Агент-ревью
юзер-контента = pluggable seam с первого поста (rule-based; LLM позже).
**Медиа — MinIO** (self-hosted S3-протокол, контейнер в docker-инфре;
dev = prod parity): бакеты avatars (public-read) / attachments (private,
presigned). В БД — только object-key. Протокол S3 = свобода переезда в любое
облако сменой env (та же логика, что gateway-апстримы).

### D6 — Chat: WebSocket-hub (фаза 3) {#d6}

Двунаправленный realtime → WS (не SSE). Hub-модуль: auth по куке на
handshake, MVP = DM + общий канал, история в таблицах, доставка in-process.
Gateway: WS-локация `/api/community/ws` (upgrade-map готов). Auth-события
(«разлогинен») смогут ездить этим каналом — бонус, предвиденный ADR 068 D4.

## Фазы {#phases}

1. **Профиль + журнал**: profile CRUD + avatar (MinIO) + events-каркас +
   первые проекции (learn-баллы) + список участников. ЛК оживает.
2. **Посты + лента** + агент-ревью seam + комменты/реакции.
3. **Чат** (WS-hub) + realtime; интеграция auth-событий.

Фронт: пакет `web-community` блоками (зеркало learn-эталона) + тонкий
`apps/community` (owner с чартером уже есть) — своими брифами по фазам.

## Последствия {#consequences}

**Плюсы:** расширяемость через проекции (путь к «полноценной соцсети» без
перестроек); медиа переносимы (S3-протокол); чат изолирован швом; identity
переиспользована, не продублирована. **Цена:** +1 сервис и fence-зона
(`backend-community`), +MinIO-контейнер в инфре, event-журнал требует
дисциплины поставщиков (только бэки, типизированные kind'ы).
