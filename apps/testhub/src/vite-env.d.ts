/// <reference types="vite/client" />
//
// Ambient Vite client-типы (`import.meta.env`, `?url`/`?raw` импорты и т.п.).

// Build-time флаг моков. Инжектится @capsuletech/vite-builder через Vite `define`
// из env CAPSULE_MOCKS (дефолт = isDev). Boolean-литерал → Rollup DCE вырезает
// мёртвую ветку: `__CAPSULE_MOCKS__ ? mockHandler : undefined` в prod-сборке без
// флага схлопывается в `undefined`. См. docs/_meta/builders.md.
declare const __CAPSULE_MOCKS__: boolean;
