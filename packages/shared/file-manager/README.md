# @capsuletech/shared-file-manager

Node-side утилиты для FS/template-кодгена внутри Capsule-тулинга. Используется в CLI и Vite-плагинах, не в апп-runtime.

API:
- `paths.ts` — `getFilename` / `getDirname` / `getPackageRoot` / `getWorkspaceRoot` / `getCapsuleRoot` / `getProjectPaths`.
- `jiti.ts` — синглтон `jiti`-инстанса для type-aware импорта user-кода (`capsule.config.ts`).
- `generateFromTemplates.ts` — обёртка над `@nx/devkit` для скаффолда из EJS-шаблонов.

`runtime: 'node'` в `vite.config.mts` — пакет НЕ предназначен для апп-бандла; импортируется только в build-time коде.

Сборка: `pnpm nx build @capsuletech/shared-file-manager`.
