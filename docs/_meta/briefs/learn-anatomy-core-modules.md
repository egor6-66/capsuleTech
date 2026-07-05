# Brief — learn: анатомия `core/` + `modules/` (scope `learn`)

**learn = эталон анатомии (канон [[feedback_mirror_means_literal_mirror]] + [[feedback_product_wide_kit_layering]]).** Сейчас плоско: 8 модуль-папок в ряд с `core/`, `controllers/` (пустой скелет) рядом же. Причёсываем: cross-cutting в `core/`, фича-модули под `modules/`. В корне `src/` остаётся только `core/ modules/ __tests__/ capsule.tsx index.ts`.

## Целевая раскладка
```
src/
  core/
    provider.tsx  apiContext.ts  interfaces.ts  index.ts
    controllers/            ← ПЕРЕНЕСТИ из src/controllers/ (cross-cutting, сейчас пустой export {})
  modules/
    library/  lessons/  exercises/*  progress/  guides/  sentence-builder/  welcome/
  __tests__/                ← остаётся в корне (package-smoke)
  capsule.tsx
  index.ts
```
*`exercise/` — оставь имя как есть (`exercise/`), не переименовывай, чтобы не плодить лишний churn. (Раскладка — папка-на-модуль, как было, просто под `modules/`.)*

## Шаги (owner-learn)
1. `git mv src/controllers src/core/controllers`. (если dir-move блокнут Windows-локом IDE — двигай по-файлово `git ls-files` → git mv в зеркало, как в durable-грабле переезда зоны.)
2. Создать `src/modules/`, перенести 7 фича-папок (`exercise guides lessons library progress sentence-builder welcome`) внутрь.
3. **Внутренние импорты** в перенесённых модулях: `../core/...` → `../../core/...` (стали на уровень глубже). Sibling-импорты внутри одного модуля НЕ меняются.
4. **`capsule.tsx`**: `from './lessons'` → `from './modules/lessons'`, `from './welcome/segments'` → `from './modules/welcome/segments'` и т.д. `from './core'` — БЕЗ изменений. (controllers сейчас в capsule не импортится — только физический перенос.)
5. **vite build entries** (`vite.config.mts`) + **package.json exports** — репойнт на новые src-пути. **Имена субпатов НЕ менять** (`@capsuletech/web-learn/lesson` и т.д. остаются — меняется только цель).
6. **Сообщить architect'у** новые src-пути модулей → он правит `tsconfig.base.json` (subpath-таргеты + заодно чинит расхождение `/lesson`→`src/lesson` vs реальная папка `lessons`).

## Что НЕ меняется
- npm-имя, имена субпатов, публичный API, регистрируемые `Learn.*` глобалы.
- Логика/UI модулей — только перемещение + правка относительных путей.

## Verify
`nx run @capsuletech/web-learn:typecheck --skip-nx-cache` + `:build` + `:test`. Всё зелёное = переезд полный. Если typecheck ругается на резолв субпата — вероятно ждёт architect'ов tsconfig-фикс (шаг 6); сообщи, не глуши.
