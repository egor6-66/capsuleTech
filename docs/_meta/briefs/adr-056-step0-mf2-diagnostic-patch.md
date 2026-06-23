# Brief — diagnostic patch для Шага 0 ADR 056 (MF2 + capsule compat check)

**Zone**: `owner-vite-builder` (`packages/builders/vite/`)
**Type**: diagnostic, throwaway — НЕ commit, architect откатит после теста
**Tree**: main shared working tree, branch `main`. Без worktree, без feature-веток.
**Goal**: понять может ли `@module-federation/vite` запуститься в нашем capsule vite pipeline вместе с Solid без Error 2 (`use` export missing).

---

## Контекст

Standalone-spike `experiments/mf2-iframe-spike/` упал в browser на двух фундаментальных ошибках:

1. `Failed to get manifest` — MF runtime пытается fetch'нуть `mf-manifest.json`, получает Vite SPA fallback (HTML), JSON.parse падает.
2. `does not provide an export named 'use'` — `@module-federation/vite` плагин генерирует virtual shared-loader модуль с `import { use } from 'solid-js/web'`. Solid не имеет `use` (это React 19 hook). Hardcoded React assumption в codegen плагина.

Это было в **vanilla vite вне capsule CLI**. Прежде чем хоронить ADR 056 D1 — проверяем то же самое в **нашем pipeline** (capsule plugins + vite-builder + vite-plugin-solid). Возможно (но маловероятно) Error 2 был артефактом standalone-стека.

Это minimal proof-of-non-compat, не implementation. **Если падает с тем же Error 2 в нашем стеке** → ADR 056 D1 окончательно RED, architect пишет revision (либо fork плагина с Solid adapter, либо alt-transport).

---

## Что менять

**Один файл:** `packages/builders/vite/src/defines/capsuleConfig.ts`

### 1. Импорты

В блок import'ов (line 1-18) добавить:

```ts
import { federation } from '@module-federation/vite';
```

В существующий `import { join } from 'node:path';` добавить `basename`:

```ts
import { basename, join } from 'node:path';
```

`@module-federation/vite` **уже установлен** в root monorepo как devDep (architect поставил через `pnpm add -w -D`). Не правь `packages/builders/vite/package.json`.

### 2. Federation block в plugins array

В массиве `plugins:` (начало line 232), **после** `solidPlugin({ ssr: false, exclude: [/[\\/]entities[\\/]/] })` (последний, line 351), добавить:

```ts
// DIAGNOSTIC: Шаг 0 ADR 056 — НЕ commit. Architect откатит.
// Параметризация по basename(root) — playground=host, universal-canvas=remote.
...(basename(root) === 'playground'
  ? [
      federation({
        name: 'host',
        remotes: {
          'universal-canvas': {
            type: 'module',
            name: 'universal-canvas',
            entry: 'http://localhost:3000/remoteEntry.js',
          },
        },
        shared: {
          'solid-js': { singleton: true },
          'solid-js/web': { singleton: true },
          'solid-js/store': { singleton: true },
        },
      }),
    ]
  : basename(root) === 'universal-canvas'
    ? [
        federation({
          name: 'universal_canvas',
          filename: 'remoteEntry.js',
          exposes: {
            './Test': join(root, 'src/remote.ts'),
          },
          shared: {
            'solid-js': { singleton: true },
            'solid-js/web': { singleton: true },
            'solid-js/store': { singleton: true },
          },
        }),
      ]
    : []),
```

Position: **после** `solidPlugin(...)` в том же массиве. Не перед.

### 3. Пересборка dist

```
pnpm --filter @capsuletech/vite-builder build
```

Обязательно — capsule CLI запускает vite-builder из `dist/`, не из `src/` (memory `feedback_rebuild_dist_after_capsule_ts_edit`).

---

## Что НЕ делать

- НЕ расширяй `ICapsuleConfig` (никакого `vitePlugins?:` surface). Это diagnostic patch, не proper API. Если step 0 PASS — design surface обсудим архитектурно отдельным брифом.
- НЕ правь `package.json` пакета `vite-builder` — `@module-federation/vite` уже в root deps.
- НЕ запускай `pnpm capsule dev` сам — это architect сделает после твоего patch + rebuild.
- НЕ форматируй / lint'и весь файл — чистый минимальный diff, иначе git restore'ить шумно.
- НЕ коммитить. После твоего report — architect (я) тестирует, затем `git restore packages/builders/vite/src/defines/capsuleConfig.ts` + `rm -rf packages/builders/vite/dist` (или rebuild чистый).

## Что делать после patch

Сообщи в чат:
- Patch применён, dist пересобран без ошибок.
- (Опционально) если `pnpm --filter @capsuletech/vite-builder build` бросил TypeScript-ошибки или предупреждения про MF2-vite shape — copy-paste их сюда, чтобы architect мог их учесть до запуска dev-сервера.

Я (architect) дальше запускаю `pnpm capsule dev` в `apps/playground` + `apps/universal-canvas`, проверяю в browser, фиксирую результат.

## Связано

- [[../../01-architecture/adr/056-web-remote-mf2-iframe-transport-hybrid|ADR 056]] — gate для D1
- [[adr-056-phase-0-spike-mf2-iframe|предыдущий бриф spike]] (морально устарел; spike vanilla-vite уже снесён, выявил Error 2)
- [[feedback_no_topic_branches_parallel_work]] — без topic branches на shared tree
- [[feedback_agent_hook_block_escalate]] — hook-block ≠ повод обходить, эскалация
