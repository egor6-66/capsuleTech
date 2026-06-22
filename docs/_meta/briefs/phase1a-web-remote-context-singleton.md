---
title: 'web-remote Phase 1a — single RemoteContext across subpath entries (host-side useRemote fix)'
status: ready
audience: owner-web-remote
last_updated: 2026-06-22
adr:
  - docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md
ai-anchor: docs/_meta/web-remote.md
relates:
  - PR #398 (RemoteManifestPlugin Phase 1a + canvas→host smoke)
  - docs/_meta/briefs/phase1a-web-core-create-capsule-app.md (parallel iframe-side fix in owner-web-core)
---

# Контекст

PR #398 закрыл **canvas→host** direction. **Host→canvas** через `useRemote().remote(name).send(event, payload)` сломан: `useRemote()` бросает `[capsule/web-remote] useRemote() must be called inside <RemoteProvider>` **даже когда вызван непосредственно как child `<Remote.Provider>`**. Bridge-эксперимент 2026-06-22 (компонент-сосед под Provider): тот же error.

Single explanation совместимая со всеми симптомами: **в host'е существуют две инстанции `RemoteContext`** — `Remote.Provider` (зарегистрированный как global через `@capsuletech/web-remote/capsule`) кладёт value в один объект, а `useRemote` (импортированный из `@capsuletech/web-remote`) читает из другого.

Дист-структура пакета:

```
dist/
  index.mjs       — re-export RemoteProvider + useRemote from chunk
  capsule.mjs     — re-export RemoteProvider + RemoteView wrapper from chunk
  chunks/useRemote-XXXX.mjs   — var k = createContext(void 0); A = Provider; j = useRemote; (single Context k)
  boot.mjs
```

Оба `index.mjs` и `capsule.mjs` импортируют `./chunks/useRemote-XXXX.mjs`. По спецификации ESM один URL = один module instance, и `k` должен быть один. Но Vite-dev при resolve через **разные subpath entries** (`@capsuletech/web-remote` vs `@capsuletech/web-remote/capsule`, оба в `optimizeDeps.exclude`) добавляет cache-busting query params, и оба entry-файла грузят chunk **с разными query strings** → два module instance → два `createContext()` call'а → два `RemoteContext` объекта.

Эта гипотеза согласована со всеми наблюдениями:

- `useRemote()` падает даже сразу под Provider (bridge-эксперимент).
- `Remote.View` (внутри capsule.mjs) внутри Provider tree работает в одном слое — но если consumer на host-уровне импортит `useRemote` из root entry, он получает другой Context.

Phase 1 acceptance в брифе `web-remote-phase1-renderer-mvp.md` не проверял эту grань — там не было сценария с прямым `useRemote()` импортом из app-кода в комбинации с global Remote.Provider.

# Скоп

Гарантировать что `RemoteContext` (и любые другие module-level singleton'ы — `IframeTransport` если bundling меняется) — **один объект** независимо от того, через какой subpath entry consumer импортит `RemoteProvider` / `useRemote` / `Remote.View`.

## Step 0 — диагностика ДО выбора варианта (обязательно)

Гипотеза «cache-busting query на excluded workspace-package → два module instance» **сама требует верификации**. У `@capsuletech/web-remote` сейчас `exclude` в optimizeDeps — Vite на excluded deps обычно НЕ добавляет cache-bust query, эта query прилетает для pre-bundled deps. Перед фиксом подтвердить или опровергнуть:

1. **DevTools Network tab** — посмотреть конкретные URL-ы chunk'а `useRemote-XXXX.mjs` при загрузке через оба subpath. Если URL'ы одинаковые → гипотеза неверна, корень в другом.
2. **Identity check** — `console.log(RemoteContext)` в `Provider` (capsule.mjs) и в `useRemote` (index.mjs) на host'е, сравнить object identity и `Symbol.for` если есть.
3. **Физическая раздвоенность пакета** — `ls node_modules/@capsuletech/web-remote/` + проверить нет ли двух копий пакета через pnpm hoisting (особенно если apps/playground vs root install).
4. **Альтернативные причины** если (1)-(3) опровергают cache-bust: HMR-перезагрузка одного entry без другого; разная нормализация относительных импортов внутри chunks/.

Выбор варианта реализации **после** того как root cause подтверждён.

## Возможные пути реализации

**Вариант A** — `optimizeDeps.include` оба entry в `@capsuletech/vite-builder/capsuleConfig` с явными `entries: ['@capsuletech/web-remote', '@capsuletech/web-remote/capsule']`. Заставит esbuild pre-bundle'ить оба entry в общий dep-граф. **Caveat:** workspace-пакеты обычно сидят в `exclude` именно потому что pre-bundle замораживает их при правках src (см. грабля vite-builder dist в `CLAUDE.md`). Применять только если диагностика подтвердила что cache-bust на excluded entries реален и нет способа победить иначе. Возможна регрессия в dev-цикле web-remote (правки src не подхватываются без рестарта).

**Вариант B (равноценный кандидат — потенциально корневой фикс)** — схлопнуть `dist/` в один `index.mjs` (re-export и `RemoteProvider`/`useRemote`, и registration-default), либо удалить subpath `./capsule` и просить registry дёргать default из root. Если subpath-split физически ломает singleton invariant — это корневое лечение, не workaround. Bundle-size loss минимальный (RemoteView маленький), interop с registry — один edit в capsule.ts. По умолчанию рассматривать наравне с A после диагностики, не как fallback.

**Вариант C (fallback)** — экспортировать `RemoteContext` и хранить в `globalThis.__CAPSULE_REMOTE_CONTEXT__` singleton-pattern'ом. Global pollution, но bullet-proof против любых bundling-нюансов. Только если A и B не сработали или несовместимы с другими constraint'ами.

# Acceptance

- [ ] **Прямой smoke (e2e через Playwright против `apps/playground` под `capsule dev`)**: в любом app-коде, вложенном в `<Remote.Provider>` (через global registration), `useRemote()` (импортированный напрямую из `@capsuletech/web-remote`) возвращает context без ошибки. **Важно:** Vite-resolve артефакт НЕ воспроизводится в Node ESM / JSdom (там один URL = один instance гарантированно) — unit-test через JSdom даст ложно-зелёный. Регрессия ловится только через реальный Vite dev-server. Если e2e harness ещё не готов — допустимо TODO с явным skip и упоминанием в OWNERSHIP.md (но НЕ выдавать unit-test за регресс этого бага).
- [ ] **`<Remote.View>` (зарегистрированный через capsule subpath) внутри Provider tree работает** (regression-cover текущего behavior — это сейчас тоже работает, нужно не сломать).
- [ ] **canvas→host smoke** (PR #398 baseline) продолжает работать.
- [ ] **host→canvas через `useRemote()`**: `apps/playground/src/widgets/studio/canvas.tsx` (или новый bridge) вызывает `const { remote } = useRemote(); remote('universal-canvas').send('ping', payload)`. Канвас ловит через `ctx.channel.on('ping', cb)` в bootstrap'е. Работает.
- [ ] **Документация**: AI-anchor `docs/_meta/web-remote.md` + OWNERSHIP.md обновлены — секция «module instance singleton invariant» с явным правилом: «`createContext` / `IframeTransport` ctor вызываются ровно один раз на app; subpath split не ломает». Зафиксировать выбранный вариант (A/B/C) и почему именно он, чтобы будущие правки exports/optimizeDeps не откатили фикс.
- [ ] **Юнит-тесты (дополнительно, не вместо e2e)**: dual-import scenario через Node ESM — один тест импортит `RemoteProvider` из `index.mjs`, `useRemote` — тоже, проверяет shared context; другой тест импортит `Provider` из `capsule.mjs` default, `useRemote` — из root, тоже shared. Это санити-чек публичного API, но НЕ покрывает Vite-resolve грань.

# Что НЕ в этом PR

- **Multi-Solid в iframe** — parallel brief в owner-web-core (`phase1a-web-core-create-capsule-app.md`). Reactive props (Decision 4 ADR-053) — там. Они независимы, могут мержиться в любом порядке.
- Cross-origin iframe — Phase 2+.
- Phase 2 transports (BroadcastChannel, postMessage standalone) — отдельный roadmap.
- HCA-injection (web-remote сам как HCA-слой) — не Phase 1a.

# Контекст для root cause

См. memory `feedback_check_generated_entry_first` + `project_remote_manifest_phase1a` — история инцидента 2026-06-22. Bridge-эксперимент (`RemoteHostBridge` непосредственно как child Provider'а с `useRemote()` внутри) показал что throw происходит даже на расстоянии одного компонента — single Provider, single useRemote, всё равно outside. Dual-instance — наиболее вероятная гипотеза, но НЕ единственная возможная (см. Step 0 пункт 4 — альтернативные причины).

Диагностика обязательна **до выбора варианта реализации** — см. Step 0 в секции «Скоп». Если гипотеза не подтверждается — копать дальше с конкретными фактами, не лечить «на удачу». См. memory `feedback_no_hypotheses_diagnose_with_tools`.
