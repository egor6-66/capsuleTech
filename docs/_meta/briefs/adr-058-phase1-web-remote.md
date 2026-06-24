---
tags: [web-remote, adr-058, brief, phase-1, owner-web-remote]
status: ready-for-owner
date: 2026-06-24
zone: owner-web-remote
adr: 058-web-remote-message-only-mode-by-intent
related:
  - 058-web-remote-message-only-mode-by-intent
  - 053-app-as-remote-symmetry-and-config-channel
  - adr-057-remote-reconsideration
---

# Brief — web-remote Phase 1: `mode`-seam + транспорт-чистка (ADR 058)

> [!info] Кому: **owner-web-remote**. Один PR, per-package scope (§0.1).
> Зона: `packages/web/runtime/remote/` целиком. Канон — [[058-web-remote-message-only-mode-by-intent|ADR 058]] (D2/D3/D4).
> Прочитай `packages/web/runtime/remote/OWNERSHIP.md` + ADR 058 перед стартом. Прогони `pnpm --filter @capsuletech/web-remote test` до изменений (должно быть green).

## Контекст (важно — почти всё уже сделано)

Сверка с main показала: пакет **уже** message-only / iframe / postMessage. `IframeTransport` —
единственный транспорт, `RemoteComponent` монтирует через iframe-srcdoc, props/config идут
envelope'ами (`__capsule_remote_props__` / `__capsule_remote_config__`), события — через `on*`.
057-машинерии (import-map, shared-realm, `LocalShadowDomTransport`, `manifestFetcher`) в main
**нет** — удалять нечего.

Остаётся **только косметика контракта** под ADR 058: добавить `mode`-seam и убрать рудимент
авто-выбора транспорта по origin. Никакой новой рантайм-логики, никакого component-режима.

## Scope этого PR — ровно два изменения

### 1. `mode?: 'app' | 'component'` — типизированный seam (ADR 058 D3/D4)

**`src/interfaces.ts` → `IRemoteComponentProps`** (сейчас строка ~98): добавить поле
```ts
/**
 * Execution substrate (ADR 058 D3). Explicit host-side declaration, orthogonal to origin.
 *  - 'app'       — iframe realm (own window/location/router). DEFAULT. Phase 1 active path.
 *  - 'component' — shadow-DOM realm. RESERVED SEAM — not implemented in Phase 1.
 */
mode?: 'app' | 'component';
```

**`src/runtime/RemoteComponent.tsx`:**
- Добавить `'mode'` в `SYSTEM_KEYS` (строка ~53) — чтобы `mode` **не уезжал** как runtime-prop
  в remote через `stripReserved`. Это reserved system-prop.
- В начале `RemoteComponent` прочитать `const mode = rawProps.mode ?? 'app';`.
- Если `mode === 'component'`: это seam без реализации. **Не throw в render** (грубо рвёт
  дерево) — вместо этого `console.error('[capsule/remote] mode="component" (shadow-DOM) not
  implemented yet — ADR 058 D3. Use mode="app" (iframe).')` **один раз** и отрендерить
  `rawProps.fallback?.('error')` (или `null`, если fallback нет). `app`-путь (текущий iframe
  рендер) остаётся единственным активным.

Дефолт `'app'` ⇒ для всех существующих consumer'ов поведение не меняется.

### 2. Убрать авто-выбор транспорта по `canReach`; подрезать `TransportKind` (ADR 058 D2/D3)

ADR 058 D2: транспорт один — `post-message`; `local` / `broadcast-channel` / `socket` — YAGNI.
ADR 058 D3: субстрат выбирается явным `mode`, не по origin → `canReach`-резолвер больше не нужен.

**`src/interfaces.ts`:**
- `TransportKind` (строка ~175): подрезать до `export type TransportKind = 'post-message';`.
  Над типом — комментарий-seam: `// Phase 1: single transport. local/broadcast-channel/socket
  = YAGNI (ADR 058 D2), re-add here when a real cross-realm/cross-device case lands.`
- `ITransport` (строка ~204): **удалить метод `canReach`** целиком (вместе с его параметром-
  объектом `{ name, instanceId, isStandalone, sameOrigin }`). Остаётся `kind`/`send`/`onMessage`/
  `dispose`.

**`src/transport/IframeTransport.ts`:**
- Удалить метод `canReach` (строки ~50-61) и его doc-комментарий. `kind`/`register`/`unregister`/
  `send`/`onMessage`/`dispose` без изменений.

**`src/runtime/RemoteComponent.tsx`:**
- Заменить `createMemo` с поиском по `canReach` (строки ~84-89) на прямой выбор единственного
  транспорта: `const transport = createMemo(() => rawProps.transports[0]);` (массив-форма во
  внутренних пропсах сохраняется — `RemoteProvider` всё ещё передаёт `[new IframeTransport(...)]`).
  `createMemo` оставить, чтобы downstream `transport()`-вызовы не трогать.

**`src/runtime/createHostHandle.ts` (🔴 источник, не тест — добавлено после сверки зоны):**
- `resolveTransport` (строки ~20-25) делает ровно тот же `transports.find((tr) => tr.canReach(...))
  ?? transports[0]`. После удаления `canReach` из `ITransport` файл **падает на typecheck**, не в
  тестах. Фикс симметричный RemoteComponent'у: `const resolveTransport = (): ITransport =>
  transports[0]!;` — массив-форма сохраняется, остальная логика `send`/`request`/`on` не меняется.

**Проверь `src/runtime/RemoteProvider.tsx`** — он конструирует массив транспортов. Убедись, что
после удаления `canReach` он по-прежнему компилится (передаёт `[new IframeTransport(sessionId)]`),
правок логики там быть не должно.

> [!warning] Полнота scope `canReach`-удаления
> `canReach` вызывается из ДВУХ источников — `RemoteComponent.tsx` И `createHostHandle.ts`. Оба
> входят в это изменение. Перед коммитом прогони `grep -r canReach src/` — должно остаться 0
> вхождений (включая типы и тесты).

## Тесты

- `src/transport/__tests__/IframeTransport.test.ts` — удалить кейсы на `canReach`.
- `src/runtime/__tests__/RemoteComponent.test.tsx` — поправить резолв транспорта (больше нет
  `canReach`); **добавить** два кейса: (а) `mode` отсутствует / `'app'` → рендерит iframe как
  раньше; (б) `mode='component'` → `console.error` + рендерит `fallback('error')`, iframe НЕ
  монтируется; (в) `mode` НЕ форвардится в remote как runtime-prop (нет в `__capsule_remote_props__`
  payload).
- `src/runtime/__tests__/createHostHandle.test.ts` — поправить любые кейсы на `canReach`/резолв
  транспорта (источник изменился, см. выше).
- Прочие тесты (`dualImport`, `buildSrcdoc`, `RemoteProvider`) — прогнать, поправить только если
  падают на удалённом `canReach`.

## Доки (CLAUDE.md §5 — breaking change в публичном API)

**OWNERSHIP.md — обновляешь В ЭТОМ ЖЕ PR (одобрено, твоя path-зона):**
- Таблица «Публичный API»: строка `ITransport` — убрать `canReach` из перечня методов; строка
  `TransportKind` — заменить `'local' | 'broadcast-channel' | 'post-message' | 'socket'` на
  `'post-message'`.
- Секция «Transport array assertion» / упоминание «Phase 2+ adds `BroadcastChannelTransport`»
  (ADR-053 D8): переформулировать — broadcast/socket теперь **YAGNI по ADR 058 D2**, не «Phase 2».
- Добавить `mode?: 'app' | 'component'` в перечень Reserved props / API-секцию (seam, default `'app'`).

**`docs/_meta/web-remote.md` (AI-anchor) — НЕ твоя зона, НЕ трогай.** Governance режет всё кроме
`packages/web/runtime/remote/`. Он тоже упоминает `canReach`/4-value `TransportKind`/BroadcastChannel
(строки 41, 197, 229) — синхронизирует **architect** в lockstep с review PR (после мержа). Это не
блокирует твой PR.

Бар для этого PR — `pnpm --filter @capsuletech/web-remote test` green + `pnpm --filter
@capsuletech/web-remote typecheck` (или `build`) green. Браузерная верификация `app`-режима
(studio-канвас в iframe, props/события через канал, редиректа нет) — **отдельный follow-up**
(owner-tests, реальный браузер; jsdom тут не покрывает — память `feedback_verify_in_browser_dont_guess`).

## Явно ВНЕ scope (не трогать)

- `component`-режим как рабочий shadow-DOM — отложен (ADR 058 D3 «реализация отложена»,
  открытые вопросы ADR). Только seam.
- `serverUrl` / `standaloneUrl` / `openStandalone` — standalone/cross-origin, вне Phase 1.
- `IRemoteMessage` routing-поля (`sessionId`/`toInstance`/…) — оставить как есть.
- Любая dedup/import-map/CSS-слияние машинерия — не возвращать (отменено ADR 058).

## Public API после PR

`<Remote.View>` / `<Remote.Provider>` / `useRemote()` / `IRemoteBootstrap` — без изменений,
кроме нового опционального `mode?: 'app' | 'component'` (дефолт `'app'`) в `IRemoteComponentProps`.
`ITransport.canReach` и расширенный `TransportKind` — внутренний контракт, удаляются осознанно
(ADR 058 D2/D3).

## После мержа

Вернуть PR architect'у на review (ADR-соответствие + что seam не протёк в runtime), затем
запланировать Brief 3 (browser-verify `app`-режима, owner-tests).
