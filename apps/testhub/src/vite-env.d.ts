/// <reference types="vite/client" />
//
// Ambient Vite client-типы — дают `import.meta.env.DEV/PROD`, `import.meta.hot`,
// `?url`/`?raw` asset-импорты и т.п.

// Build-time флаг моков. Инжектится @capsuletech/vite-builder через Vite `define`
// из env CAPSULE_MOCKS (дефолт = isDev). Boolean-литерал → Rollup DCE вырезает
// мёртвую ветку: `__CAPSULE_MOCKS__ ? mockHandler : undefined` в prod-сборке без
// флага схлопывается в `undefined`, мок-payload уходит из бандла, endpoint идёт
// в реальную API.
declare const __CAPSULE_MOCKS__: boolean;
