# Brief — `trace` как санкционированный app-глобал (owner @capsuletech/vite-builder)

**ADR:** [[062-runtime-observability-trace-channel]]. **Пакет:** `@capsuletech/vite-builder` (`packages/builders/vite/`).

> Овнерство по пакету. Этот бриф — пакету `@capsuletech/vite-builder` (там `capsuleConfig` → `HOOK_IMPORTS`).

## Зачем
Чтобы app-код мог инструментировать **свои** узлы трейсом (как сейчас web-remote инструментирует свои), `trace` должен быть **санкционированным app-глобалом** (auto-import, как `useEmit`/`useCtx`) — без ручного импорта в апе (правило «без импортов в app»). Это нужно для текущей охоты (инструментация studio-композиции) и вообще для app-level observability.

## Что сделать
- В `capsuleConfig.ts` → `HOOK_IMPORTS` (карта auto-import для unplugin-auto-import) добавить:
  ```ts
  '@capsuletech/web-profiler/trace': ['trace', 'startTrace', 'span'],
  ```
  (минимум `trace`; `startTrace`/`span` — для причинных цепочек.)
- Убедиться, что генерируемый `.capsule/@types/capsule-imports.d.ts` объявит эти глобалы (типизация auto-import) — если генератор берёт из HOOK_IMPORTS, доп. работы нет; иначе добавить.
- `@capsuletech/web-profiler/trace` — лёгкий leaf-субпат, no-op когда тогл off (гард до сборки события) → безопасно как глобал, ноль оверхеда.

## Проверка
- App-файл может звать `trace('app.x', 'mount', {...})` **без импорта**, TS видит глобал.
- Пересобрать vite-builder dist (`pnpm --filter @capsuletech/vite-builder build`) — apps читают builder из dist, без пересборки auto-import не подхватится; апам нужен рестарт dev.
- Прогнать `pnpm --filter @capsuletech/vite-builder build` + затронутые тесты. Вернуть последние строки.

## НЕ делать
- НЕ трогать сам web-profiler (субпат уже есть). НЕ трогать apps/*. Push не делать (commit-only).
