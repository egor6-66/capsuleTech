/// <reference types="vite/client" />
//
// Ambient Vite client-типы — дают `import.meta.env.DEV/PROD`, `import.meta.hot`,
// `?url`/`?raw` asset-импорты и т.п. Нужны, в частности, для dev-only guard'ов
// вида `import.meta.env.DEV ? makeMock() : []` (Vite конст-фолдит литерал в
// prod → tree-shake вырезает мёртвую ветку целиком).
