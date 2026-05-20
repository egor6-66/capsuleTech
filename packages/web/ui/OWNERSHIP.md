---
name: "@capsuletech/web-ui"
owner-agent: owner-web-ui
group: web_base
status: pre-1.0
last-updated: 2026-05-20
---

# @capsuletech/web-ui

Stateless UI-kit для capsule: ~15 primitives (Button, Input, Card, Field, Toggle, Typography, ...) + layout-namespace (`Layout.Grid`, `Layout.Flex`, `Layout.Matrix`). Polymorphic через Slot (Kobalte), CVA + createStyle (из web-style), themed tokens only.

## Зона ответственности

### Owns

- `packages/web/ui/src/primitives/` — все primitives: button, input, label, card, field, flex, grid, list, navigation, separator, slot, toggle, typography, matrix, wrappers/* (animate, resizable как internal `flex/_resize/`).
- `packages/web/ui/.storybook/` — Storybook config (`main.ts`, `vite.config.ts`, `preview.ts`).
- `packages/web/ui/.babelrc` — Babel config для CVA.
- `packages/web/ui/vite.config.mts` — build config (multi-entry, один subpath per primitive).
- `packages/web/ui/package.json` — exports / deps / peerDeps.
- Все `*.stories.tsx` рядом с primitives.

### Не трогает

- Theme tokens, createStyle, cn, merge — `owner-web-style`.
- `Ui` namespace registry — `web-core/src/ui-kit/imports.tsx` (`owner-web-core`). При добавлении нового primitive нужно **согласовать**: web-ui экспортит → web-core добавляет lazy-импорт в imports.tsx.
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework scope).

## Публичный API

Каждый primitive имеет собственный subpath export для tree-shaking:

```ts
// Main barrel (всё одной строкой, удобно для типов)
import { Button, Input, Card, Layout, Matrix, ... } from '@capsuletech/web-ui';

// Subpath (для tree-shake в bundler'е)
import { Button } from '@capsuletech/web-ui/button';
import { Matrix } from '@capsuletech/web-ui/matrix';
import { Flex } from '@capsuletech/web-ui/flex';
import { Grid } from '@capsuletech/web-ui/grid';
```

### Subpath exports (через `package.json.exports`)

`./button`, `./card`, `./field`, `./flex`, `./grid`, `./input`, `./label`, `./layout` (deprecated alias на matrix), `./list`, `./matrix`, `./navigation`, `./separator`, `./slot`, `./toggle`, `./typography`, `./wrappers`.

### Layout namespace

`Layout` экспортирован НЕ как single component — это **namespace через web-core**: `Ui.Layout.Grid`, `Ui.Layout.Flex`, `Ui.Layout.Matrix`. Сборка namespace происходит в `web-core/src/ui-kit/imports.tsx`.

### Matrix slots — typed inline objects

`Ui.Layout.Matrix slots={{ ... }}` принимает inline-objects напрямую (без helper'а). Symbol-brand discriminator в `IResizableSlotConfig` дискриминирует `JSX.Element | IResizableSlotConfig` так что TS autocomplete показывает поля config'а (`children/resizable/initialSize/...`) для object-literal-form.

**Это контракт.** Изменение subpath layout / API primitive — breaking change для consumer'ов.

## Quirks / gotchas

- **Storybook требует свои devDeps** — `@tailwindcss/vite`, `vite-tsconfig-paths`, `storybook`, `storybook-solidjs-vite`. Если `pnpm storybook:ui` падает на `Cannot find package` — добавь missing dep в `devDependencies`, **не** quick-fix через global install.

- **Matrix middle row `style={{height: '100%', width: '100%'}}`** — не `flex-1` / `h-full`. corvu Panel parent имеет `display: block`, поэтому `flex-1` collapses до content size. Inline-style надёжнее. Если будет рефактор — сохрани этот паттерн.

- **`class-variance-authority`** — в **direct dependencies**, не peer. cva вызывается на runtime внутри primitives, поэтому запекаем в каждый user'ский bundle. Это **dual-package hazard** на чистом ESM, но cva stateless — два экземпляра не конфликтуют.

- **`@kobalte/core`, `@tanstack/solid-virtual`** — **peer dependencies** (singleton runtime). User должен иметь их в node_modules через CLI app template (`auto-install-peers=true`).

- **`@corvu/resizable`** — в dependencies (запекается в dist). Внутреннее использование в Flex resize режиме (`flex/_resize/primitives.tsx`).

- **`lucide-solid`** — devDependency only. Используется в `_mocks.tsx` для storybook icons. НЕ в production dist.

- **Все primitives stateless.** Никаких signal'ов или effect'ов в самих компонентах. State держится в Controller через UiProxy (web-core).

- **Polymorphic через Slot.** Через Kobalte's Polymorphic system. `<Button as="a" href="...">` валиден если CVA-настройки совпадают. Не делаем custom Slot — используем Kobalte.

- **Resizable namespace deprecated.** Раньше был `wrappers/resizable/`. Сейчас в `flex/_resize/` (internal). Public — через `<Flex resizable items={...}>` или `Ui.Layout.Matrix`. `Ui.Resizable` остался alias на `Flex` для backwards compat.

## План рефакторинга / оптимизаций

- [ ] **Завести `docs/_meta/web-ui.md` AI anchor** — без него Claude-инстансы перечитывают весь README. (priority: high)
- [ ] **Покрытие unit-тестами** — сейчас опираемся на Storybook visual + capsule-test smoke. Unit-тестов для CVA variants практически нет. (priority: medium)
- [ ] **Visual regression через Chromatic / Playwright** — Storybook есть, но visual diff'ы не запускаются. (priority: low)
- [ ] **A11y audit primitives** — Kobalte даёт базу, но Card / Field / Layout — наши, требуют проверки. (priority: medium)
- [x] **Layout → Matrix rename + namespace** — Grid/Flex/Matrix объединены под `Ui.Layout` (2026-05-20).
- [x] **Flex получил resize mode** — corvu wrapped, deprecate'нул отдельный Resizable (2026-05-20).
- [x] **Matrix.slot() helper удалён** — symbol-brand discriminator на inline objects (2026-05-20).

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Stories | `src/primitives/**/*.stories.tsx` | visual + interactive по всем primitives и variants |
| Unit | — | пробел — minimal coverage |
| E2E (косвенно) | `packages/cli/e2e/smoke.mjs` | bootstrap + базовый рендер через capsule-test |

**Перед изменением primitive contract'а:**
1. `pnpm storybook:ui` — open `http://localhost:6006/`, visual smoke.
2. `pnpm --filter @capsuletech/web-ui build` — green.
3. Capsule-test app (e.g. `ewc-client`) рендерит без 503/runtime-error.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| Theme tokens, createStyle, cn, merge | owner-web-style |
| `Ui.*` namespace registry (lazy imports) | owner-web-core |
| Slot Polymorphic (Kobalte adapter) | owner-web-style |
| Wrapper definitions (Entity/Widget/Page) | owner-web-core |
| Storybook viewerFinal config | owner-builders (если использует vite-builder plugins) |

## Release group

`web_base` (fixed): web-core + web-dnd + web-editor + web-profiler + web-query + web-remote + web-renderer + web-router + web-state + web-style + web-ui + shared-zod.

После изменений web-ui — координировать release через главного (`pnpm release:local:web` или `--group=all`).

Связанные:
- `docs/_meta/web-ui.md` — AI-anchor (когда заведём).
- Storybook на `http://localhost:6006/` — live доки.
