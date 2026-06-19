---
title: MountProvider в @capsuletech/web-ui/lib — host-controlled Portal mount target
status: ready
audience: owner-web-ui (cross-PR с architect на одной ветке, продолжение feat/input-etalon-form-split)
last_updated: 2026-06-19
---

# Контекст

Kit'овские Portal-based примитивы — **Select**, **Dropdown**, **Tooltip** — монтируют свои popover'ы в `document.body` JS-контекста через Kobalte Portal (по умолчанию). Это работает для большинства консумеров, но **не работает когда host рендерится в iframe** (или Shadow DOM, или внутри модального Dialog'а, где нужен specific mount target).

Конкретный triggering use-case — **`@capsuletech/web-studio` `CanvasFrame`** (`packages/web/studio/src/canvas-frame/CanvasFrame.tsx:18-22` — комментарий «Чего НЕ даёт»). Same-origin iframe для preview-области изолирует DOM, но JS-контекст родительский — Portal уезжает в app's body, popper'у floating-ui считает `getBoundingClientRect()` для trigger'а в iframe, координаты не сходятся → popover невидим / в неправильном месте.

Это **не studio-specific** — те же сценарии:

- Modal/Dialog: Kobalte popover внутри shadcn-Dialog должен монтиться **внутрь** Dialog'а чтобы фокус-trap работал.
- Storybook / docs site: preview в iframe.
- Shadow DOM (Web Components-обёртка вокруг capsule-app).
- Custom drag-overlay / split-view preview.

Решение — **generic host-controlled mount target** через Solid context в kit.

> **Привязка к канону.** `feedback_packages_adapt_to_architecture`: kit должен поддерживать legitimate host-сценарии без app-escape-hatches. Текущий хардкод `document.body` (Kobalte default) — implicit assumption «один main document»; декларируем явно.

# Скоп

Cross-PR на той же ветке `feat/input-etalon-form-split` (architect параллельно работает над playground/web-studio).

## Phase 1 — `@capsuletech/web-ui/lib/mountTarget/`

Новый модуль в kit `lib` subpath:

```
packages/web/kit/ui/src/lib/mountTarget/
├── index.ts
└── MountProvider.tsx
```

`MountProvider.tsx`:

```tsx
import { type Accessor, createContext, type JSX, useContext } from 'solid-js';

/**
 * Mount target — куда `@capsuletech/web-ui` Portal-based примитивы (Select,
 * Dropdown, Tooltip) монтируют свои popover'ы. По дефолту они идут в
 * `document.body` JS-контекста (Kobalte default). Host может override'нуть
 * через `<MountProvider>` чтобы:
 *  - монтить внутрь iframe body (canvas-preview изоляция);
 *  - монтить внутрь Dialog content (фокус-trap не разрывается);
 *  - монтить в Shadow DOM root (Web Components wrapper);
 *  - монтить в custom split-view container.
 *
 * Generic ability — НЕ привязан к studio/iframe. Использует любой host
 * которому нужен specific mount target для kit Portal'ов.
 *
 * Контекст реактивен — `value` принимает `HTMLElement | undefined` или
 * Accessor (для случаев когда mount target появляется async, как iframe body
 * после `load`-event).
 */

type MountTarget = HTMLElement | undefined;
type MountTargetSource = MountTarget | Accessor<MountTarget>;

const MountTargetContext = createContext<Accessor<MountTarget>>();

const toAccessor = (src: MountTargetSource): Accessor<MountTarget> =>
  typeof src === 'function' ? (src as Accessor<MountTarget>) : () => src;

export interface IMountProviderProps {
  /**
   * Mount target. Принимает `HTMLElement` (статичный target) или Accessor
   * (для async-появляющегося target'а — например, iframe body после load).
   * `undefined` — kit-примитивы fallback'ятся на Kobalte default (`document.body`).
   */
  value: MountTargetSource;
  children: JSX.Element;
}

export const MountProvider = (props: IMountProviderProps) => (
  <MountTargetContext.Provider value={toAccessor(props.value)}>
    {props.children}
  </MountTargetContext.Provider>
);

/**
 * Читает текущий mount target из контекста. Возвращает Accessor — value
 * реактивен (host может менять mount target on-the-fly: iframe body после
 * load, Dialog content на open/close).
 *
 * Вне `<MountProvider>` возвращает Accessor отдающий `undefined` — fallback
 * на Kobalte default.
 */
export const useMountTarget = (): Accessor<MountTarget> => {
  const ctx = useContext(MountTargetContext);
  return ctx ?? (() => undefined);
};
```

`index.ts`:
```ts
export type { IMountProviderProps } from './MountProvider';
export { MountProvider, useMountTarget } from './MountProvider';
```

Дополнить `packages/web/kit/ui/src/lib/index.ts`:
```ts
export * from './finish';
export * from './infiniteScroll';
export * from './mountTarget';   // ← новый
export * from './pagination';
```

## Phase 2 — Wire в Select / Dropdown / Tooltip

Все три уже принимают `portalProps` (pass-through к Kobalte Portal). Kobalte Portal принимает `mount?: Node`. Паттерн интеграции — **hybrid**:

1. Если `portalProps.mount` задан явно — уважаем (consumer prop-drilled).
2. Иначе — читаем `useMountTarget()` из контекста.
3. Иначе — Kobalte default (`document.body`).

### Phase 2a — `select/select.tsx`

В `Content` компоненте:

```tsx
import { useMountTarget } from '../../lib/mountTarget';

const Content = (props: ISelectContentProps) => {
  const [local, others] = splitProps(props, ['class', 'style', 'portalProps']);
  const finish = createFinish({ opaque: true });
  const mountFromCtx = useMountTarget();

  // Portal mount: explicit prop > context > Kobalte default (undefined → body).
  const portalProps = () => {
    const raw = local.portalProps ?? {};
    return raw.mount !== undefined ? raw : { ...raw, mount: mountFromCtx() };
  };

  return (
    <KobalteSelect.Portal {...portalProps()}>
      ...
```

### Phase 2b — `dropdown/dropdown.tsx`

Та же логика в `Content` (line 72-81) и `SubmenuContent` (line 242-251). Оба используют `KobalteDropdown.Portal {...local.portalProps}`. Заменить на:

```tsx
const mountFromCtx = useMountTarget();
const portalProps = () => {
  const raw = local.portalProps ?? {};
  return raw.mount !== undefined ? raw : { ...raw, mount: mountFromCtx() };
};
// ...
<KobalteDropdown.Portal {...portalProps()}>
```

### Phase 2c — `tooltip/tooltip.tsx`

Та же логика в `Content` (line 137-145).

## Phase 3 — Tests

`packages/web/kit/ui/src/lib/mountTarget/__tests__/MountProvider.test.tsx`:

1. **Default behavior** — без Provider'а `useMountTarget()` возвращает Accessor отдающий `undefined`.
2. **Static value** — `<MountProvider value={el}>` → `useMountTarget()()` возвращает `el`.
3. **Accessor value** — `<MountProvider value={() => el()}>` → реактивно меняется при изменении `el`.
4. **Nested override** — внутренний Provider перекрывает внешний.

Не обязательно тестировать каждый primitive отдельно (Select/Dropdown/Tooltip) — паттерн интеграции одинаков и тривиален (forward to Kobalte). Достаточно одного integration-теста на Select Portal с custom mount target если несложно (опционально).

## Phase 4 — Docs

Обновить kit AI-anchor `docs/_meta/web-ui.md` секцию про Portal-based primitives:

> Select / Dropdown / Tooltip монтируют popover'ы через Kobalte Portal. Default mount = `document.body`. Host может override'нуть через `<MountProvider value={el}>` (`@capsuletech/web-ui/lib/mountTarget`) чтобы монтить в кастомный target (iframe body, Dialog content, Shadow DOM). Per-instance override — `portalProps.mount={el}` на Content.

Cross-link на пример из `@capsuletech/web-studio/canvas-frame` (когда будет реализовано в студии — это **отдельный followup, НЕ в этом брифе**).

## Phase 5 — Sanity-check

1. `pnpm --filter @capsuletech/web-ui build` — multi-entry должен подхватить `lib/mountTarget/` автоматически (lib subpath uses same auto-discovery).
2. `pnpm --filter @capsuletech/web-ui test` — green (+ новые MountProvider тесты).
3. `pnpm nx run-many -t typecheck --projects=web-ui,web-studio,web-core` — публичный API kit'а только дополнен (без breaking), не должно быть регрессий.
4. `pnpm nx affected -t test build --base=origin/main` — pre-push gate.

# Чего НЕ делать

- НЕ создавать `@capsuletech/web-portal` отдельным пакетом — это 30 строк context-абстракции, kit-internal.
- НЕ менять public API Select / Dropdown / Tooltip ломающим образом — `portalProps.mount` остаётся опциональным, дефолтное поведение прежнее (`document.body`).
- НЕ wire'ить MountProvider в `WebStudio.CanvasFrame` в рамках этого брифа — studio update идёт **отдельным брифом для owner-web-studio** после landing'а этого PR (architect примет решение когда).
- НЕ менять `tsconfig.base.json` — `lib` subpath уже зарегистрирован, новый `mountTarget` подпуть резолвится через `lib/*` glob.
- НЕ добавлять new dep'ы — всё на Solid встроенном (createContext / useContext / Accessor).

# Acceptance

- ✅ `packages/web/kit/ui/src/lib/mountTarget/{index.ts, MountProvider.tsx, __tests__/MountProvider.test.tsx}` — созданы.
- ✅ `packages/web/kit/ui/src/lib/index.ts` — экспортит mountTarget.
- ✅ `select/select.tsx`, `dropdown/dropdown.tsx`, `tooltip/tooltip.tsx` — `Content`/`SubmenuContent` читают `useMountTarget()` и пробрасывают в `portalProps.mount` если consumer не задал явно.
- ✅ `docs/_meta/web-ui.md` — раздел про Portal-based primitives обновлён.
- ✅ `pnpm --filter @capsuletech/web-ui build` + `test` — green.
- ✅ Без MountProvider в дереве kit-Select / Dropdown / Tooltip работают как раньше (Portal в `document.body`).
- ✅ С `<MountProvider value={el}>` обёрткой Portal монтится в `el` (можно проверить unit-тестом с jsdom — `<MountProvider value={containerEl}><Select options={[...]} /></MountProvider>` → открыть программно — поповер появляется внутри `containerEl`).

# Workflow

- **Та же ветка** `feat/input-etalon-form-split`.
- Commit-only, без push (push делает user/architect после verify).
- Conventional commits:
  - `feat(web-ui): MountProvider context in lib/mountTarget`
  - `feat(web-ui): Select/Dropdown/Tooltip consume MountProvider for portal mount`
  - `docs(web-ui): document MountProvider for portal-based primitives`
- Можно склеить в один commit если так чище.

# Followups (НЕ в этом брифе)

- Studio: `CanvasFrame` экспозит iframe body как сигнал → `<MountProvider value={iframeBody}>` обёртка вокруг children — fixes store-mode Select preview quirk. Отдельный бриф для owner-web-studio после landing MountProvider'а в kit.
- Memory / docs: добавить в kit AI-anchor строчку «Portal-based primitives respect MountProvider» как known capability.

# Связанное

- `packages/web/studio/src/canvas-frame/CanvasFrame.tsx:18-22` — known limitation, motivating use-case.
- `packages/web/kit/ui/src/primitives/select/select.tsx:78-101` — Content + KobalteSelect.Portal.
- `packages/web/kit/ui/src/primitives/dropdown/dropdown.tsx:65-81,235-251` — Content + SubmenuContent + KobalteDropdown.Portal.
- `packages/web/kit/ui/src/primitives/tooltip/tooltip.tsx:130-145` — Content + KobalteTooltip.Portal.
- `packages/web/kit/ui/src/lib/finish/` — реферс паттерна kit-internal lib-модуля (то же место в дереве).
- `docs/_meta/briefs/select-etalon.md` — родительский бриф (Select эталон).
- memory `feedback_packages_adapt_to_architecture` — kit поддерживает host-сценарии без escape-hatches.
- memory `feedback_canon_modules_no_crutches` — PRIORITY 0 §0.
