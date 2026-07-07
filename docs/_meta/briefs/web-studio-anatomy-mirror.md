# Бриф: web-studio — раскладка под learn-эталон (3 яруса `shared/ core/ modules/`)

**Зона:** owner-studio (`packages/web/workspace/studio/`). Коммить scope-тегом `studio`, **НЕ пушить** — push/merge делает architect после verify ([[feedback_agents_commit_only_user_pushes]]).

**Перед стартом прочитай:**
- `docs/_meta/package-anatomy.md` — **канон анатомии (ПО learn). Это твой закон раскладки.**
- Эталон рядом: `packages/web/workspace/learn/src/` (`core/ modules/ shared/`). Открой и держи открытым — раскладываешь **буквально по нему** ([[feedback_mirror_means_literal_mirror]]).
- `packages/web/workspace/studio/OWNERSHIP.md`, `docs/_meta/web-studio.md`.
- Прогони `pnpm --filter @capsuletech/web-studio test` — **зелёный baseline ДО правок** (зафиксируй хвост вывода).

---

## Зачем (канон)

learn доведён до эталона: `core/` (cross-cutting) + `modules/<block>/` (блоки со своим стором) + `shared/<atom>/` (атомы). studio сейчас **плоский** — модули, провайдеры, стор, data-слой вперемешку на одном уровне. Равняем studio на learn.

**Рефактор поведенчески-нейтрален:** перенос файлов + правка внутренних импортов. Ключи глобалов `WebStudio.*` в `capsule.ts` и публичные субпаты (`package.json exports`) **НЕ меняются**. Рендер модулей не меняется.

---

## Целевая раскладка (studio → learn-анатомия)

### `core/` — cross-cutting (новая папка)
| Из | В | Заметка |
|---|---|---|
| `providers/StudioProvider.tsx` | `core/provider.tsx` | корневой провайдер (`WebStudio.Provider`); зеркало `learn/core/provider.tsx` |
| `providers/canvasContext.ts` | `core/canvasContext.ts` | контекст `canvasName` |
| `providers/CanvasBinding.tsx` | `core/CanvasBinding.tsx` | logic-связка document→канвас; cross-cutting glue |
| `providers/DragChip.tsx` | `shared/` (см. ниже) | это презентационный атом, не провайдер |
| `document.ts` | `core/document.ts` | SSOT редактируемого дерева — читают/пишут все модули |
| `navigation/useStudioMode.ts` | `core/useStudioMode.ts` | **cross-cutting**: режим из URL читают document, CanvasBinding, inspector, info → это НЕ часть navigation-модуля |

Собери `core/index.ts` (barrel): провайдер + контекст + `useDocument` + `useStudioMode` (то, что раньше торчало из `document`/`providers`). Ориентир — `learn/core/index.ts`.

> **Направление импортов:** `core/CanvasBinding` теперь импортит `./document`, `./canvasContext`, `./useStudioMode` (всё локально в core) — раньше тянул `../navigation/useStudioMode` (это и был симптом «core-логика в модуле»).

### `shared/` — атомы (новая папка)
| Из | В | Заметка |
|---|---|---|
| `manifests/` (registry, rules, types + `__tests__`) | `shared/manifests/` | reference-data-слой: потребляют palette/inspector/info/document. Аналог `learn/shared/words`. **Публичный субпат `./manifests` сохраняется** (см. §Субпаты). |
| `providers/DragChip.tsx` | `shared/dragChip/` (`DragChip.tsx` + `index.ts`) | презентационный атом drag-overlay. Если считаешь, что единственный потребитель — Provider, и держать его атомом избыточно — допустимо оставить `core/` рядом с провайдером; на твоё усмотрение, но НЕ в `modules/`. |

### `modules/<block>/` — блоки (новая папка, переносим как есть)
Каждый — папкой в `modules/`, внутренняя структура не трогается:
`canvas/` · `info/` · `inspector/` (+ `fields/`) · `navigation/` (МИНУС `useStudioMode` → core) · `palette/` · `styles/` · `tree/` · `welcome/`.

- `canvas/` = `modules/canvas/` (решение architect+user: сейчас `WebStudio.Canvas` — тонкий `<Remote.View>`, значит обычный блок-презентация, не cross-cutting).
- `styles/` = `modules/styles/` целиком (`StylesPanel.tsx` = панель-блок; `canvas-theme.ts` едет с ним — потребитель только панель).
- `navigation/`: после выноса `useStudioMode` в core — `navigation/index.ts` и `navigation/Navigation.tsx` импортят `useStudioMode` из `../../core`.

### Корень
`capsule.ts` и `index.ts` остаются в `src/`. Правишь **только источники импортов** внутри них (пути на `./core`, `./modules/*`, `./shared/*`), НЕ ключи/экспорты.

---

## Субпаты — публичный контракт (имена НЕ менять)

`package.json exports` реальные субпаты: `.`, `./manifests`, `./capsule`, `./palette`. Их **имена сохраняются**, меняются только внутренние цели:

- `./manifests` → теперь указывает на `src/shared/manifests/index.ts`
- `./palette` → теперь `src/modules/palette/index.ts`
- `./capsule` → `src/capsule.ts` (без изменений)
- `.` → `src/index.ts` (без изменений)

Правки в **твоей зоне**:
- `package.json` — если `exports` захардкожен на dist-имена (`./dist/manifests.mjs`), имена dist-выходов оставь как есть; поправь только если билд-конфиг меняет имя entry.
- **Билд-конфиг** (`vite.config.*` / lib-builder entries): entry `manifests` → `src/shared/manifests/index.ts`, entry `palette` → `src/modules/palette/index.ts`. Выходные имена (`manifests.mjs`, `palette.mjs`) сохрани — иначе поедут `exports`.
- `index.ts` — реэкспорты `./manifests`/`./palette`/`document` перецелить на новые пути (`./shared/manifests`, `./modules/palette`, `./core`).

**tsconfig.base.json — НЕ трогаешь** (shared-infra, architect). Там же architect почистит мёртвые субпаты (`/state /generators /controllers /docs /inspector` — таких папок нет).

---

## Verify (перед commit)

- `pnpm --filter @capsuletech/web-studio test` — зелёный (тесты переезжают вместе с папками; число не должно упасть).
- `pnpm --filter @capsuletech/web-studio typecheck` — 0 ошибок.
- `pnpm --filter @capsuletech/web-studio build` — собирается, субпат-выходы `manifests.mjs`/`palette.mjs` на месте.
- Grep: в `src/` не осталось `providers/` (папки нет), `from './document'` (стало `./core`/`../core`), `../navigation/useStudioMode`.
- Sanity направления: нет импортов `core/*` из `modules/*` (core не тянет модуль).

В отчёте architect'у верни: список тронутых файлов (перемещения + правки) + **реальный хвост** вывода test/typecheck/build (не пересказ).

## Готово =
раскладка `shared/ core/ modules/` буквально по learn; `capsule.ts` ключи и субпаты-имена не изменились; поведение модулей то же; test/typecheck/build зелёные.

## Companion (architect, ПОСЛЕ твоего коммита)
- `tsconfig.base.json` — перецелить `@capsuletech/web-studio/manifests` → `src/shared/manifests/index.ts`; убрать мёртвые `/state /generators /controllers /docs /inspector`; при желании добавить `./palette`.
- App-side (`apps/playground` или `apps/studio`) правок быть не должно — контракт глобалов/субпатов сохранён. Если что-то поедет — эскалируй, не глуши.
