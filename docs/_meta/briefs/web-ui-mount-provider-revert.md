---
title: Revert MountProvider — iframe-подход отменён, переходим на @capsuletech/web-remote
status: ready
audience: owner-web-ui
last_updated: 2026-06-19
parent: web-ui-mount-provider.md (closed, commit fa42bdbb)
---

# Контекст

Бриф `web-ui-mount-provider.md` (PR cca61e0b) добавил в kit `lib/mountTarget/` — Solid-context для override Kobalte Portal mount target. Цель была — починить Kobalte popover'ы (**Select**, **Dropdown**, **Tooltip**) в studio canvas, который рендерится в same-origin iframe.

**Эксперимент провалился по корню.** Реальная диагностика в браузере:

- `<Select>` смонтированный в iframe-вложенном body **не реагирует на click** на trigger (даже с правильным `portalProps.mount = iframeBody`). Popover не открывается вообще — то есть проблема не в позиционировании Portal'а, а в том что click до Kobalte handler не доходит. Корень — Solid event delegation работает через JS-document host'а; click в iframe-document не делегируется.
- Тот же Select **за пределами iframe** работает корректно — подтверждение что регрессии в Select нет.

**Архитектурное решение** (обсуждение 2026-06-19 late): отказываемся от iframe-канваса в студии вообще. Рендерер становится самостоятельной remote-app (через `@capsuletech/web-remote`, ADR-015) — со своим Solid root, своим event delegation, своим стилевым окружением. Изоляция, mode-параметризация (studio / standalone / embed) и общение через типизированные пропсы/события — естественные свойства remote-runtime, не workaround поверх iframe.

Следствие — **MountProvider в kit больше не нужен**. Это была абстракция под единственный известный use-case (canvas-iframe), который теперь архитектурно мёртв. Оставлять "впрок" — нарушение канона §0 (модули, не монолит): дополнительная поверхность kit без реального consumer'а. Если в будущем появится legitimate use-case (Modal/Dialog, Shadow DOM, Web Components) — вернём через свежий бриф с реальной потребностью.

> **Привязка к канону.** `feedback_canon_modules_no_crutches` §0: эталон = функционал доведён до конца + реальный consumer. MountProvider без живого consumer'а — это абстракция-предсказание, не эталон. Откатываем.

# Скоп

Полный revert изменений из бриф'а `web-ui-mount-provider.md` (commit `fa42bdbb` на бывшей ветке `feat/input-etalon-form-split`, теперь в main через PR #391 cca61e0b).

## Phase 1 — Удалить `lib/mountTarget/`

```
packages/web/kit/ui/src/lib/mountTarget/         # удалить директорию целиком
├── index.ts
├── MountProvider.tsx
└── __tests__/MountProvider.test.tsx  (если был создан)
```

И убрать строку из `packages/web/kit/ui/src/lib/index.ts`:

```diff
 export * from './finish';
 export * from './infiniteScroll';
-export * from './mountTarget';
 export * from './pagination';
```

## Phase 2 — Unwire из Select / Dropdown / Tooltip

### Phase 2a — `primitives/select/select.tsx`

В `Content`:

```diff
-import { useMountTarget } from '../../lib/mountTarget';
-
 const Content = (props: ISelectContentProps) => {
   const [local, others] = splitProps(props, ['class', 'style', 'portalProps']);
   const finish = createFinish({ opaque: true });
-  const mountFromCtx = useMountTarget();
-
-  const portalProps = () => {
-    const raw = local.portalProps ?? {};
-    return raw.mount !== undefined ? raw : { ...raw, mount: mountFromCtx() };
-  };

   return (
-    <KobalteSelect.Portal {...portalProps()}>
+    <KobalteSelect.Portal {...local.portalProps}>
       ...
```

`portalProps` остаётся как public prop (consumer может задать `mount` вручную) — снимаем только context-резолв.

### Phase 2b — `primitives/dropdown/dropdown.tsx`

Та же логика в `Content` и `SubmenuContent` — убрать `useMountTarget()` и `portalProps()` computed, вернуть прямой spread `{...local.portalProps}`.

### Phase 2c — `primitives/tooltip/tooltip.tsx`

Та же логика в `Content` — убрать `useMountTarget()` и computed, вернуть прямой spread.

## Phase 3 — Docs

Если в `docs/_meta/web-ui.md` появилась секция про MountProvider (Phase 4 родительского бриф'а) — удалить её. Заменить на одно предложение в Quirks/known limitations:

> Kit Portal-based primitives (Select / Dropdown / Tooltip) монтируют popover'ы в `document.body` через Kobalte default. В iframe-сценариях Solid event delegation не пересекает frame boundary — это известное ограничение. Изоляция компонентов в host'е решается через `@capsuletech/web-remote` (свой Solid root), не через iframe + mount override.

## Phase 4 — Sanity-check

1. `pnpm --filter @capsuletech/web-ui build` — без mountTarget entry в multi-entry.
2. `pnpm --filter @capsuletech/web-ui test` — green (MountProvider тесты должны быть удалены вместе с модулем).
3. `pnpm nx run-many -t typecheck --projects=web-ui` — публичный API только сократился (без MountProvider/useMountTarget); если консумеры что-то импортили (НЕ должны были в kit — только studio мог) — будет TS error, эскалировать.
4. `pnpm nx affected -t test build --base=origin/main` — pre-push gate.

# Чего НЕ делать

- НЕ трогать `packages/web/studio/*` — studio CanvasFrame будет откатан/переработан архитектором отдельно (creator-mode переезжает на `<Remote>`).
- НЕ удалять `portalProps` как public prop на Select/Dropdown/Tooltip — оставляем как pass-through к Kobalte (consumer может задать `mount` вручную если знает что делает).
- НЕ менять breaking changes в Select/Dropdown/Tooltip API за пределами revert'а — только убрать context-резолв.
- НЕ публиковать на Verdaccio — release координирует architect отдельно.

# Acceptance

- ✅ `packages/web/kit/ui/src/lib/mountTarget/` — удалена.
- ✅ `packages/web/kit/ui/src/lib/index.ts` — без `./mountTarget` экспорта.
- ✅ `select/select.tsx`, `dropdown/dropdown.tsx`, `tooltip/tooltip.tsx` — без `useMountTarget` импорта; `portalProps` пробрасывается напрямую в `Kobalte<X>.Portal`.
- ✅ `docs/_meta/web-ui.md` — секция про MountProvider удалена / заменена на известное ограничение.
- ✅ `pnpm --filter @capsuletech/web-ui build` + `test` — green.
- ✅ `pnpm nx run-many -t typecheck --projects=web-ui` — green.
- ✅ Behavior: Select/Dropdown/Tooltip в main-document работают как и были; в iframe-сценариях известное ограничение задокументировано (не workaround в kit'е).

# Workflow

- **Новая ветка** `revert/web-ui-mount-provider` от `main`.
- Commit-only, без push (gate-3 — push делает architect/user после verify).
- Conventional commits:
  - `revert(web-ui): drop MountProvider — iframe approach abandoned (renderer moves to @capsuletech/web-remote)`
  - Можно одним commit'ом — revert маленький.

# Связанное

- `docs/_meta/briefs/web-ui-mount-provider.md` — родительский бриф (closed, commit `fa42bdbb`).
- `docs/_meta/briefs/web-remote-phase1-renderer-mvp.md` — заменяет архитектурно (Phase 1 MVP для renderer use-case).
- `docs/01-architecture/adr/015-remote-modules.md` — ADR remote-runtime.
- memory `feedback_canon_modules_no_crutches` — §0 эталон требует реального consumer'а.
- memory `feedback_root_cause_before_fix` — корневой диагноз перед фиксом (Solid event delegation через main doc).
