# Brief — micro-fix: `optimizeDeps.exclude` для SHARED_DEPS (Phase 1A bug)

**Zone**: `owner-vite-builder` (`packages/builders/vite/`)
**Type**: micro-fix
**Tree**: main shared, **не коммитить**.

---

## Bug

Browser verify показал **multi-Solid warning** + два разных Solid module instance:

```
solid-js.js?v=3245683e   ← instance #1
solid-js.js?v=5d89054a   ← instance #2
```

URL'ы это `/node_modules/.vite/deps/solid-js.js?v=HASH` — **Vite's optimizeDeps pre-bundled cache**, не наши `/_shared/...` URL'ы. То есть **import-map в `<head>` не используется** — Vite в dev режиме **pre-resolve'ит bare specifiers через optimizeDeps РАНЬШЕ чем browser применяет import-map**.

Caskaдные симптомы:
- `cleanups created outside createRoot` (cleanup в одном Solid, root в другом)
- Double `bootstrap (createCapsuleApp)` (dual mount)
- Auth/router crash → redirect на `/`

## Cause

Browser-level import-map работает только для bare specifiers которые **не resolved'нуты build tool'ом**. Vite-dev делает:

1. Browser получает `<script type="importmap">{...}</script>` ✅
2. Browser встречает `import 'solid-js'` в код
3. **Vite intercept'ит** через own resolver → переписывает на `/node_modules/.vite/deps/solid-js.js?v=HASH`
4. Browser получает уже resolved URL → import-map **не применяется** (он работает только для bare specifiers)

Чтобы import-map работал, нужно сказать Vite **не pre-bundle'ить эти пакеты**. Тогда `import 'solid-js'` придёт в browser как bare → import-map проксирует к `/_shared/...`.

## Fix

В `importMap.ts` (либо как часть ImportMapPlugin) — добавить `config` hook возвращающий `optimizeDeps.exclude`:

```ts
export const ImportMapPlugin = (opts) => {
  return {
    name: 'capsule:import-map',
    enforce: 'pre',  // важно — до vite's optimizeDeps decision'ов
    config(userConfig) {
      return {
        optimizeDeps: {
          exclude: [...(userConfig.optimizeDeps?.exclude ?? []), ...SHARED_DEPS],
        },
        resolve: {
          // Также важно — НЕ дедуплицировать SHARED_DEPS (иначе Vite alias'ит к workspace local)
          // Если capsuleConfig.ts уже имеет dedupe для solid-js/web/store — это конфликтует.
          // Возможно потребуется убрать SHARED_DEPS из dedupe либо оставить как есть и проверить.
        },
      };
    },
    // ... existing transformIndexHtml, configureServer, closeBundle
  };
};
```

### Известный конфликт — `dedupe`

`capsuleConfig.ts:91-97` определяет:
```ts
const dedupe = [
  'solid-js',
  'solid-js/web',
  'solid-js/store',
  '@capsuletech/web-ui',
  '@capsuletech/web-state',
];
```

Это для **legacy** multi-Solid workaround (Vite дедуплицирует к workspace local versions). С import-map'ом это **больше не нужно** (дедуп на URL-level в browser). Но **не удаляй** — может другие places полагаются. **Просто проверь** что dedupe + exclude не конфликтуют — Vite должен exclude winning при `enforce: 'pre'`.

Если конфликтуют (увидишь stale `/node_modules/.vite/deps/solid-js.js` после patch) — flag architect, обсудим (может нужно убрать `dedupe` либо conditional based on import-map).

## Verify

После patch + rebuild:

1. Kill server + restart
2. `curl http://localhost:3050/ | grep importmap` — import-map должен быть на месте (не сломал)
3. Open browser http://localhost:3050, DevTools Network:
   - Должен быть request на `/_shared/solid-js@1.9.12/dist/solid.js` (200 + JS)
   - **НЕ должно быть** request на `/node_modules/.vite/deps/solid-js.js?v=HASH`
4. Console:
   - **НЕТ** `You appear to have multiple instances of Solid`
   - **НЕТ** `cleanups created outside createRoot`
5. After login → `/workspace/web-studio` — Remote.View должен mount без redirect-loop

## Tests

Add к `importMap.test.ts`:
- ImportMapPlugin'а `config` hook возвращает `optimizeDeps.exclude` содержащий все `SHARED_DEPS`

## После fix

```
pnpm --filter @capsuletech/vite-builder build
pnpm --filter @capsuletech/vite-builder test
```

Working tree update только в `importMap.ts` + test. НЕ коммитить, architect перезапускает dev-сервера, browser verify.

## Если упрётся в conflict с dedupe

Если **после exclude всё равно остаются 2 instance Solid** — это значит dedupe выигрывает. Тогда нужен один из:
- (A) Conditionally remove `dedupe` entries которые в `SHARED_DEPS` (когда ImportMapPlugin активен)
- (B) Полное удаление `dedupe` массива (но проверить что без него ничего другое не ломается)

Flag architect, выберем подход.

## Связано

- [[adr-057-phase1-vite-builder]] — original Phase 1A brief
- [[adr-057-phase1a-fix-resolveShared-conditions]] — previous micro-fix (browser ESM conditions)
- [[../../01-architecture/adr/057-web-remote-import-maps-native-esm|ADR 057]]
- `capsuleConfig.ts:91-97` — `dedupe` legacy workaround
