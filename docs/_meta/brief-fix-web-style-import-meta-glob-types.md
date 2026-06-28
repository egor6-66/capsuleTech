# Brief — fix: робастный тип `import.meta.glob` в web-style (owner @capsuletech/web-style)

**Зона:** `packages/web/runtime/style/src/switcher/theme.ts`. **Приоритет: P2** (CI-typecheck блокер для cross-package веток). **Push:** НЕ делать — commit-only, architect/user пушат.

## Симптом

На ветке `feat/remote-comms` `pnpm nx run-many -t typecheck` падает:
```
packages/web/runtime/style/src/switcher/theme.ts(7,1): error TS2578: Unused '@ts-expect-error' directive.
```
На `main` — зелено. То есть это не регресс web-style, а **хрупкость**, которую вскрывает другая ветка.

## Почему (root cause)

`theme.ts:7-8`:
```ts
// @ts-expect-error
const themeModules = import.meta.glob('../themes/*.css', { eager: true });
```
`import.meta.glob` — Vite-only API; без `vite/client` ambient-типов tsc не знает поле `import.meta.glob` → ошибка, которую и подавляет `@ts-expect-error`.

Проблема: **используется ли `@ts-expect-error` или нет — зависит от состава tsc-программы.** Когда web-style типечекается standalone (как на main) — `vite/client` не в программе → `import.meta.glob` без типа → ошибка есть → директива «используется» → green. Когда web-style попадает в программу обхода **потребителя**, который тянет `vite/client` (на `feat/remote-comms` web-remote теперь импортит `@capsuletech/web-profiler/trace` + `@capsuletech/web-core/events`, и граф обхода подтягивает `vite/client` ambient) → `import.meta.glob` типизирован глобально → ошибки нет → `@ts-expect-error` лишний → **TS2578**.

`@ts-expect-error` на vendor-API, типизированном условно = брittle by design: ломается ровно когда кто-то рядом включает `vite/client`.

## Что сделать

Сделать тип `import.meta.glob` **детерминированным**, не зависящим от состава программы — и убрать `@ts-expect-error`:

```ts
/// <reference types="vite/client" />
// ...
const themeModules = import.meta.glob('../themes/*.css', { eager: true });   // без @ts-expect-error
```

`/// <reference types="vite/client" />` в начале файла гарантирует, что `import.meta.glob` типизирован ВСЕГДА (и standalone, и в графе потребителя) → директива не нужна ни в одном контексте.

Альтернатива (на твой вкус, если предпочитаешь tsconfig-уровень): добавить `"vite/client"` в `compilerOptions.types` пакета web-style. Но per-file `/// <reference>` локальнее и не меняет глобальный typecheck-конфиг пакета — рекомендую его.

## Проверка

1. `pnpm nx run @capsuletech/web-style:typecheck` — green (standalone, как на main).
2. Если доступно — `pnpm nx run @capsuletech/web-remote:typecheck` на ветке-потребителе: тоже green (было красным от этого TS2578).
3. `pnpm --filter @capsuletech/web-style build` — green.

Вернуть последние строки typecheck/build + затронутый файл.

## НЕ делать
- Не менять логику theme.ts (DISCOVERED_THEMES / applyTheme и т.д.) — только типизация glob + снять директиву.
- Не трогать другие `@ts-expect-error` в пакете без отдельного сигнала.
- Не трогать apps/* и другие пакеты.
