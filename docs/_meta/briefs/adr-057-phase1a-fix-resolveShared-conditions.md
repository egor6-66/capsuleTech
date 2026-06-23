# Brief — micro-fix: `resolveShared` browser ESM conditions (Phase 1A bug)

**Zone**: `owner-vite-builder` (`packages/builders/vite/`)
**Type**: micro-fix
**Tree**: main shared, **не коммитить**.

---

## Bug

`ImportMapPlugin.resolveShared()` (или helper использующий `require.resolve()`) резолвит shared deps к **CJS server-side bundles** вместо browser ESM:

```
solid-js → /_shared/solid-js@1.9.12/dist/server.cjs     ← должно быть solid.js (browser ESM)
solid-js/web → .../web/dist/server.cjs                  ← должно быть .../web/dist/web.js
solid-js/store → .../store/dist/server.cjs              ← должно быть .../store/dist/store.js
```

Browser ESM parser упадёт на `module.exports = ...` (CJS syntax).

## Cause

`require.resolve()` без явных conditions использует Node defaults (`node`/`import`) → CJS server bundle. Нужно `browser` + `solid` conditions для Solid.

Существующий precedent в codebase: `capsuleConfig.ts:359` использует `conditions: ['solid', 'browser', 'import']` именно для этого.

## Fix

В `importMap.ts → resolveShared()` (либо helper аналогичный) — replace bare `require.resolve(pkg, { paths })` на условный resolve с explicit conditions:

```ts
// Replace:
const resolved = require.resolve(pkg, { paths: [appRoot] });

// With (Node 20+ has resolve API):
import { createRequire } from 'node:module';
import { resolve as importMetaResolve } from 'node:url';

// Simplest: use enhanced resolution via existing 'resolve.exports' либо вручную walk:
// 1. require.resolve к package.json (root)
// 2. Прочитать pkg.exports, найти соответствующий subpath
// 3. Выбрать ключ с приоритетом ['solid', 'browser', 'import', 'default']
```

**Альтернатива (проще)** — захардкодить известные канонические пути для каждого `SHARED_DEPS` пакета:

```ts
const KNOWN_BROWSER_PATHS: Record<string, string> = {
  'solid-js': 'dist/solid.js',
  'solid-js/web': 'web/dist/web.js',
  'solid-js/store': 'store/dist/store.js',
  // @capsuletech/* пакеты — все экспортируют dist/index.mjs либо index.mjs (читай pkg.exports или pkg.module/main)
};
```

Для `@capsuletech/*` — посмотри в package.json каждого, чтоб понять правильный browser ESM entry point (обычно `dist/index.mjs` либо `./index.mjs`).

**Рекомендую** — pragmatic подход: `KNOWN_BROWSER_PATHS` для Solid (3 hardcoded) + `pkg.exports['.']` walker для остальных с conditions `['solid', 'browser', 'import', 'default']`. Это самое robust без зависимости от `resolve.exports` package'а.

## Verify

После patch:

```
curl http://localhost:3050/
# В import-map должно быть:
#   solid-js: "/_shared/solid-js@1.9.12/dist/solid.js"
#   solid-js/web: "/_shared/solid-js@1.9.12/web/dist/web.js"
#   solid-js/store: "/_shared/solid-js@1.9.12/store/dist/store.js"
#   @capsuletech/web-router: "/_shared/@capsuletech/web-router@0.1.1/dist/index.mjs"  (or /index.mjs depending on pkg)

# И что fetch отдаёт actual JS:
curl http://localhost:3050/_shared/solid-js@1.9.12/dist/solid.js | head -3
# должно начинаться с ESM (export ... либо комментарий solid header), НЕ "module.exports"
```

## Tests

Add к `importMap.test.ts`:
- `resolveShared('solid-js')` → ends with `/dist/solid.js`, не `/server.cjs`
- `resolveShared('solid-js/web')` → `/web/dist/web.js`
- Read content snippet — confirms ESM (`export` либо absence of `module.exports`)

## После fix

```
pnpm --filter @capsuletech/vite-builder build
pnpm --filter @capsuletech/vite-builder test
```

Working tree update только в `packages/builders/vite/src/plugins/importMap.ts` + соответствующий test. НЕ коммитить, architect перезапускает dev-сервера и делает browser verify.

## Связано

- [[adr-057-phase1-vite-builder]] — initial brief Phase 1A
- [[../../01-architecture/adr/057-web-remote-import-maps-native-esm|ADR 057]]
- precedent: `capsuleConfig.ts:359` `conditions: ['solid', 'browser', 'import']`
