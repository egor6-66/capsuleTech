---
tags: [web-remote, adr-058, brief, bugfix, owner-web-remote]
status: ready-for-owner
date: 2026-06-24
zone: owner-web-remote
branch: feat/web-remote-adr058-phase1
related:
  - 058-web-remote-message-only-mode-by-intent
  - adr-058-phase1-web-remote
---

# Brief — fix: host crash when remote app is offline (graceful placeholder)

> [!info] Кому: **owner-web-remote**, запуск в scope: `claude-scope remote owner-web-remote`.
> Ветка уже `feat/web-remote-adr058-phase1` (НЕ создавать новую). Прочитай
> `packages/web/runtime/remote/OWNERSHIP.md` перед правкой (ownership-gate). НЕ коммить —
> architect коммитит после review. Диагноз ниже подтверждён architect'ом + сверкой кода.

## Баг (предсуществующий, НЕ из ADR 058 PR)

Хост монтирует `<Remote.View mode="app">` для модуля, чей remote-app **не запущен**. Manifest-fetch
падает (`GET .../capsule.manifest.json net::ERR_CONNECTION_REFUSED`) → **краш всего хоста**: ошибка
улетает в TanStack-router CatchBoundary («The following error wasn't caught by any route»). Ожидается
плейсхолдер/fallback, а не краш.

## Корень

`createResource` для `manifest` входит в error-state. `srcdoc = createMemo(...)` зовёт `manifest()`
**безусловно**. В Solid чтение errored-ресурса **ре-throw**'ит — throw внутри memo-computation
улетает наверх и валит хост. `<Switch>` c `<Match when={manifest.error}>` не помогает: memo бросает
раньше/независимо от рендера Switch. Гард `if (!m || !mf)` не срабатывает — `manifest()` бросает до него.

## Фикс (2 правки в `src/runtime/RemoteComponent.tsx`)

**Hunk A — `srcdoc` memo: гард на `.loading`/`.error` ДО вызова `manifest()`** (чтение `.loading`/
`.error` не бросает, бросает только `manifest()`):

```diff
-  // Build srcdoc only when both module config and manifest are available
-  const srcdoc = createMemo(() => {
-    const m = module();
-    const mf = manifest();
-    if (!m || !mf) return undefined;
+  // Build srcdoc only when both module config and manifest are available.
+  // IMPORTANT: reading manifest() re-throws when the resource entered error state
+  // (e.g. remote app offline → ERR_CONNECTION_REFUSED). Guard on .loading/.error
+  // BEFORE calling manifest() so the throw never escapes the memo and crashes the
+  // host — the <Switch> error Match renders the fallback/placeholder instead.
+  const srcdoc = createMemo(() => {
+    const m = module();
+    if (!m || manifest.loading || manifest.error) return undefined;
+    const mf = manifest();
+    if (!mf) return undefined;
     const url = bootUrl as string;
     return buildSrcdoc({ /* ...unchanged... */ });
   });
```

**Hunk B — error-`<Match>`: дефолтный плейсхолдер, когда consumer не передал `fallback`:**

```diff
-      <Match when={manifest.error}>{rawProps.fallback?.('error')}</Match>
+      <Match when={manifest.error}>
+        {rawProps.fallback?.('error') ?? (
+          <div
+            data-capsule-remote-error={rawProps.name}
+            style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#888;font:13px system-ui;padding:8px;text-align:center"
+          >
+            remote "{rawProps.name}" unavailable
+          </div>
+        )}
+      </Match>
```

Loading-`<Match>` не трогать.

## Тесты (`src/runtime/__tests__/RemoteComponent.test.tsx`)

Добавить блок `describe('manifest fetch failure (remote offline)')` с моком `fetch`, который
**reject**'ит (`vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))` — под существующий
fetch-mock паттерн файла). Кейсы:
1. render НЕ бросает (`expect(() => render(...)).not.toThrow()`), после `await ~20ms` контейнер жив.
2. `container.querySelector('iframe')` === null при reject.
3. без `fallback`-пропа → есть `[data-capsule-remote-error="hello"]` плейсхолдер.
4. с `fallback`-пропом → `fallback` вызван с `'error'`, кастомный узел отрисован, дефолтный
   плейсхолдер отсутствует.

(Готовый код 4 кейсов есть у architect'а из owner-агента — можно взять как есть, подогнав под
хелперы файла: `render`, `container`, `transport`, `SESSION`, `makeModules`, `disposeRoot`.)

## Verify до возврата

- `pnpm --filter @capsuletech/web-remote test` → green (52 + 4 новых).
- `pnpm --filter @capsuletech/web-remote build` → green.

Вернуть architect'у: diff-summary + счётчики тестов. НЕ git commit.
