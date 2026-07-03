# capsule dev-gateway

Dev-prod parity (ADR 068 D6): один origin `http://localhost:8080` для всех фронтов и бэков,
path-роутинг как в проде. Без него аппы на портах = разные origin'ы → BroadcastChannel
(auth-синк логаута) и куки ведут себя НЕ как на серваке.

## Запуск (один раз)

```powershell
docker compose -f docker/gateway/compose.yml up -d
```

Дальше всё как обычно: `pnpm dev` в аппе, `nx run backend-X:serve` — gateway тупой
и stateless, просто маршрутизирует то, что запущено (не запущено → 502 на пути).

Открывать: `http://localhost:8080/` — живая карта маршрутов.

## Подключение нового аппа

1. `apps/<name>/capsule.config.ts` → `base: '/<name>/'`.
2. Локация в `nginx.conf` (см. блок «фронты») + строка в `index.html`.
3. `docker compose -f docker/gateway/compose.yml restart gateway`.

Прямой порт продолжает работать: Vite с `base` раздаёт апп на `:<port>/<name>/`.

## Подключение нового бэк-сервиса

Локация `/api/<svc>/ → :<port>/<svc>/` в `nginx.conf` (префикс `/api` срезается,
сервис про gateway не знает).

## Конвенции

- Фронты обязаны жить на одном origin (ADR 068 D5) — иначе BroadcastChannel мёртв.
- API-базы аппов после мержа vite-proxy (`server.proxy '/api' → :8080`, бриф
  `builders-dev-api-proxy.md`) — относительные `'/api'`; до него — абсолютные порты.
- Прод-nginx повторяет форму локаций этого конфига (path-routing за одним доменом).
