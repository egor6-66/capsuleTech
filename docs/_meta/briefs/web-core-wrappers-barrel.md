# Бриф: web-core — узкий authoring-barrel `@capsuletech/web-core/wrappers` (для пакетов)

**Зона:** owner-web-core (`packages/web/core/`). Scope-тег `web-core`, **НЕ пушить**.

**Контекст (арх-решение user 2026-07-06):** доменные пакеты начинают авторить блоки теми же HCA-обёртками, что и апп (см. канон-тестбед `@capsuletech/web-moderator`). Чтобы пакет НЕ тянул весь рантайм web-core (createRoot, провайдеры, proxy-внутренности) и импорты не превращались в кашу — нужен **отдельный узкий barrel** только с авторингом.

**Перед стартом:** `docs/_meta/web-core.md` (AI-anchor), `pnpm --filter @capsuletech/web-core test` — зелёный baseline.

---

## Что сделать

Новый субпат-export **`@capsuletech/web-core/wrappers`**, экспортящий ТОЛЬКО authoring-поверхность:

**Обёртки:** `Entity`, `View`, `Shape`, `Widget`, `Controller`.
**Хуки авторинга:** `useEmit`, `useEmitOptional`, `useCtx`.
**Типы:** авторинг-интерфейсы, нужные для написания блоков (props/target/services-контракты из `wrappers/interfaces.ts` — то, что реально требуется потребителю-пакету; не тащи рантайм-типы).

**❌ НЕ экспортировать из этого barrel:** `Page`, `Feature` (они app-only — исключение из barrel'а структурно enforce'ит правило «пакет не авторит Page/Feature»), а также `createRoot`, `BaseProviders`, UiProxy/ControllerProxy-внутренности, bootstrap-машинерию. Всё это остаётся в главном barrel / своих субпатах для аппа.

## Как

- Скорее всего уже есть `src/wrappers/` — собери `src/wrappers/index.ts` (или отдельный barrel-файл) с перечисленным набором. Если `Page`/`Feature` там же — реэкспортируй выборочно (barrel тянет 5 обёрток без Page/Feature).
- `package.json` — добавь в `exports` ключ `"./wrappers"` (по образцу существующих субпатов web-core: `types`/`import`/`default` на `dist/wrappers.*`).
- **Билд-конфиг** (vite/lib-builder entries) — добавь entry `wrappers` → `src/wrappers/index.ts` (выход `wrappers.mjs`).
- Проверь **tree-shaking**: импорт `{ View } from '@capsuletech/web-core/wrappers'` НЕ должен тянуть createRoot/провайдеры в бандл потребителя (barrel не реэкспортит рантайм транзитивно).

## Companion (architect)
`tsconfig.base.json` — добавлю путь `@capsuletech/web-core/wrappers` → `packages/web/core/src/wrappers/index.ts` после твоего коммита. (Плюс optimizeDeps, если нужно.)

## Verify
- `pnpm --filter @capsuletech/web-core test` + `:typecheck` + `:build` — зелёные, новый entry `wrappers.mjs` в dist.
- Импорт-smoke: во временном файле `import { Entity, View, Shape, Widget, Controller, useEmit, useEmitOptional, useCtx } from '@capsuletech/web-core/wrappers'` резолвится; `Page`/`Feature` из него НЕ доступны (ожидаемо).
- Главный barrel `@capsuletech/web-core` не сломан (обратная совместимость — апп продолжает брать всё оттуда/из своих субпатов).

Отчёт: тронутые файлы, содержимое экспорта barrel'а, хвост test/typecheck/build.

## Готово =
`@capsuletech/web-core/wrappers` отдаёт ровно 5 обёрток (без Page/Feature) + 3 хука + авторинг-типы; tree-shake чистый; главный barrel цел. Разблокирует авторинг пакетов (moderator-тестбед).
