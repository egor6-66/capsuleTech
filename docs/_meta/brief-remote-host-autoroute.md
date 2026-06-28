# Brief — remote→host: auto-route forwarded out-events в host-логику (B)

**Цель:** forwarded app→host событие (ремоут `emit(name ∈ contract.out)` → forward-gate → хост) должно попадать в **ближайший оборачивающий host-логик-враппер** как именованный хендлер, а не только в `on<Event>` JSX-проп. Тогда `<Remote.View>` внутри `<Features.Canvas>` отдаёт `canvasClick` прямо в её хендлер — без app-клея.

**Почему B (а не app-glue):** канон-модель user'а «ремоут пуляет → хост ловит в Feature/Controller». Симметрично host→remote (тот инжектит в КОРНЕВУЮ логику ремоута через host-bridge) — remote→host должен инжектить в ОБОРАЧИВАЮЩУЮ логику хоста (там где висит `Remote.View`). Механика — та же, что ADR 061 (ближайший enclosing logic-wrapper). App-glue требовал бы inner-компонент внутри Feature (useEmit биндится по месту вызова) — бойлерплейт, убираем в корне.

Кросс-пакет: **сначала Part 1 (web-core), потом Part 2 (web-remote)** — web-remote зависит от нового экспорта.

---

## Part 1 — owner-web-core (scope `core`, `packages/web/runtime/core/`) — ✅ СДЕЛАНО (commit `aaf924da`)

`useEmitOptional` добавлен в `engine/use-emit.ts` (no-op вне scope, не throw) + экспорт в барле + тесты. ОК.

## Part 1b — owner-web-core: выделенный субпатч `@capsuletech/web-core/events` (ИСПРАВЛЕНИЕ)

**Почему:** Part 2 НЕ должна тянуть `useEmitOptional` из общего барла `@capsuletech/web-core` (`.`) — это втягивает в web-remote все wrapper'ы/провайдеры/bootstrap. Нужен лёгкий субпатч, как web-remote уже берёт `EMBED_PROTOCOL` из `@capsuletech/web-core/bootstrap`. (Мой косяк в первой версии брифа — извинения, флоу был неверный.)

- Создать `src/events/index.ts`:
  ```ts
  // Лёгкий event-channel субпатч для пакетов-потребителей (web-remote и т.п.).
  export { useEmit, useEmitOptional } from '../engine/use-emit';
  ```
- `vite.config.mts` — добавить entry: `events: 'src/events/index.ts'`.
- `package.json` `exports` — добавить:
  ```json
  "./events": { "types": "./dist/events/index.d.ts", "import": "./dist/events.mjs", "default": "./dist/events.mjs" }
  ```
- Проверить, что entry `events.mjs` остаётся **лёгким** (только `use-emit` + транзитив `ctx`/`derivation`/`emit-context` — все лёгкие; НЕ должно тащить `wrappers/`/`providers/`). Если транзитив тянет вес — флагнуть architect'у, не тащить молча.
- Барл-экспорт `useEmitOptional` оставить (back-compat). Прогнать `test` + `build`.

## Part 2 — owner-web-remote (scope `remote`, `packages/web/runtime/remote/`)

В `RemoteComponent.tsx` — app→host event-routing эффект (сейчас строки ~195-220, маршрутит forwarded → `on<Event>` пропы).

- Импорт: `import { useEmitOptional } from '@capsuletech/web-core/events';` (СУБПАТЧ, НЕ барл `@capsuletech/web-core`).
- В **топе** компонента (hook-scope, НЕ внутри onMessage): `const emit = useEmitOptional();`
- В onMessage-обработчике forwarded contract-события (после фильтра `RESERVED_EVENTS` + `msg.from === name`):
  - **precedence (рекомендую):** если соответствующий `on<Event>` проп присутствует → зовём его (текущее поведение, explicit escape); **иначе** → `emit(msg.eventName, { payload: msg.payload })` — роутит в ближайший оборачивающий host-логик-враппер. Без двойной доставки.
  - Guard: `useEmitOptional` = no-op вне логик-scope (`Remote.View` в голой странице без Feature) → как сегодня, событие просто дропается. Никаких регрессий для текущих on-prop-консьюмеров.
- Обновить doc-блок «Delivery (ADR 060 D1)» в шапке файла: forwarded событие → `on<Event>` (если задан) ИЛИ fallthrough в host-HCA через enclosing logic.
- **Тесты:** forwarded без on-prop → `emit` вызван с (name, {payload}); с on-prop → on-prop вызван, `emit` НЕ вызван (precedence); вне scope → no-op, не кидает.
- НЕ трогать host→app inbound, transport, instanceId-логику. Прогнать `pnpm --filter @capsuletech/web-remote test` + `build`.

---

## НЕ делать (оба)
- Git push (commit-only; интеграцию координирует architect/user — дерево shared, app-WIP на `feat/remote-comms`).
- Nested-remote edge (хост сам embedded в другой хост, имя ∈ его contract.out) — out of scope, отдельный ADR при необходимости.

## Контекст ×2 (для сведения, НЕ фиксить в этом брифе)
После B наблюдаем host-Feature хендлер `canvasClick`. Если фаерит ДВАЖДЫ на один клик — это старый pong×2, диагностируем ОТДЕЛЬНО по директиве (чистый репро → классификация double-forward vs double-receive → фикс). Не пытаться предугадать в этой правке.

## App-сторона (уже готова, НЕ трогать)
- `apps/universal-canvas`: onClick канваса эмитит `canvasClick` (∈ out, `{value, ts}`); standalone — локальный хендлер, embedded — форвард.
- `apps/playground/src/features/canvas.tsx`: хендлер `canvasClick` ловит forwarded событие (ждёт Part 2).
- Host-виджет `Remote.View` уже стоит ВНУТРИ `Features.Canvas` — для B доп. on-prop НЕ нужен.
