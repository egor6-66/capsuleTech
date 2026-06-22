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

Возможные пути реализации (выбрать):

**Вариант A (preferred)** — `optimizeDeps.include` оба entry в `@capsuletech/vite-builder/capsuleConfig`. Сейчас `@capsuletech/web-remote` сидит в `exclude`. Перенос в `include` с явными `entries: ['@capsuletech/web-remote', '@capsuletech/web-remote/capsule']` заставит esbuild pre-bundle'ить оба entry в **общий** dep-граф → shared chunk через одну URL. Smoke: после изменения `useRemote()` под Provider не бросает.

**Вариант B** — упростить `dist/` — собрать всё в один файл `dist/index.mjs`, который экспортирует и `RemoteProvider`/`useRemote` (для прямого импорта) и default-export для `capsule` registration. Subpath `./capsule` exports мапить туда же или удалить subpath, registry просит default-export из root. Меньше chunks → меньше шансов на dual-instance.

**Вариант C** — экспортировать сам `RemoteContext` из публичного API и хранить его в `globalThis.__CAPSULE_REMOTE_CONTEXT__` singleton-pattern'ом. Не идеально (global pollution), но bullet-proof против любых bundling-нюансов. Использовать только если A и B не работают.

# Acceptance

- [ ] **Прямой smoke**: в любом app-коде, вложенном в `<Remote.Provider>` (через global registration), `useRemote()` (импортированный напрямую из `@capsuletech/web-remote`) возвращает context без ошибки. Тест-fixture в `packages/web/runtime/remote/src/runtime/__tests__/` симулирует двух-entry загрузку через JSdom mount, ловит regression.
- [ ] **`<Remote.View>` (зарегистрированный через capsule subpath) внутри Provider tree работает** (regression-cover текущего behavior — это сейчас тоже работает, нужно не сломать).
- [ ] **canvas→host smoke** (PR #398 baseline) продолжает работать.
- [ ] **host→canvas через `useRemote()`**: `apps/playground/src/widgets/studio/canvas.tsx` (или новый bridge) вызывает `const { remote } = useRemote(); remote('universal-canvas').send('ping', payload)`. Канвас ловит через `ctx.channel.on('ping', cb)` в bootstrap'е. Работает.
- [ ] **Документация**: AI-anchor `docs/_meta/web-remote.md` + OWNERSHIP.md обновлены — секция «module instance singleton invariant» с явным правилом: «`createContext` / `IframeTransport` ctor вызываются ровно один раз на app; subpath split не ломает».
- [ ] Юнит-тесты regress: dual-import scenario explicit (один тест импортит `RemoteProvider` из `index.mjs`, `useRemote` — тоже, проверяет shared context; другой тест импортит `Provider` из `capsule.mjs` default, `useRemote` — из root, тоже shared).

# Что НЕ в этом PR

- **Multi-Solid в iframe** — parallel brief в owner-web-core (`phase1a-web-core-create-capsule-app.md`). Reactive props (Decision 4 ADR-053) — там. Они независимы, могут мержиться в любом порядке.
- Cross-origin iframe — Phase 2+.
- Phase 2 transports (BroadcastChannel, postMessage standalone) — отдельный roadmap.
- HCA-injection (web-remote сам как HCA-слой) — не Phase 1a.

# Контекст для root cause

См. memory `feedback_check_generated_entry_first` + `project_remote_manifest_phase1a` — история инцидента 2026-06-22. Bridge-эксперимент (`RemoteHostBridge` непосредственно как child Provider'а с `useRemote()` внутри) показал что throw происходит даже на расстоянии одного компонента — single Provider, single useRemote, всё равно outside. Это единственная гипотеза, совместимая с фактами.

Перед началом работы — **верифицировать** dual-instance гипотезу через DevTools Network tab (URL-ы chunks по двум subpath resolve) ИЛИ через инструментацию (`console.log(RemoteContext)` в Provider и в useRemote, сравнить object identity). Если гипотеза не подтверждается — копать дальше с конкретными фактами, не лечить «на удачу». См. memory `feedback_no_hypotheses_diagnose_with_tools`.
