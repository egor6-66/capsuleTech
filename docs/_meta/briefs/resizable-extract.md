---
title: Resizable — extract из Flex (split + migration, без эталона)
status: ready
audience: owner-web-ui + owner-boost-layout (architect coordinates, работают напрямую в `main`, commit-only, без push)
last_updated: 2026-06-20
---

# Контекст

Сейчас `@capsuletech/web-ui` Flex несёт два несовместимых режима в одном компоненте:

| Режим | Trigger | Работает | НЕ работает |
|---|---|---|---|
| **CSS-flex** | `children` | direction/wrap/align/justify/gap/gapX/gapY/fluid/sizing/inline/as/empty-state/style | resize |
| **items-mode** | `items={IFlexItem[]}` | resize (corvu) + orientation + `class`/`style` | wrap/align/justify/fluid/gap/gapX/gapY/inline/as/empty-state |

`StaticItemsFlex` (items без resize) — хуже всех: дублирует CSS-flex, но игнорирует половину Flex-API.

Решение (согласовано с user'ом 2026-06-20): **split на два примитива.** Flex остаётся CSS-flex с children; resize выезжает в новый `Layout.Resizable` (тип `ui.Layout.Resizable`).

**Скоп этого брифа — extract + migrate всех потребителей.** Эталон-канон (contract / presets / manifest / propsSchemaOf / README) для Resizable — **отдельным брифом ПОСЛЕ Flex-эталона**. Здесь только: переезд кода, новый API surface, миграция call-сайтов, очистка Flex.

Historical note: в `wrappers/index.ts:1-3` стоит `@deprecated Resizable has been merged into Flex` — то есть `Resizable` когда-то был отдельным, его слили. Откатываем это решение осознанно: items-mode без полного flex-API стал источником проблем (см. таблицу выше). Мотив слияния (вероятно «не плодить layout-примитивы») перевешен реальностью пользования.

# Карта изменений

```
packages/web/kit/ui/src/primitives/layout/
├── flex/
│   ├── flex.tsx              ← очистка: убрать items-ветку, IFlexItem, withHandle/handleDisabled/onSizesChange
│   ├── interfaces.ts         ← убрать items/withHandle/handleDisabled/onSizesChange/IFlexItem
│   ├── flex.manifest.tsx     ← не трогаем (отдельный этap эталон-флоу)
│   ├── flex.stories.tsx      ← убрать items-story
│   ├── _resize/              ← move → ../resizable/_resize/
│   ├── index.ts              ← неизменно
│   └── __tests__/flex.test.tsx ← убрать items-mode тесты (~15 шт), перенести в resizable.test.tsx
│
└── resizable/                ← новый
    ├── resizable.tsx         ← extracted ResizableFlex + StaticItemsFlex + fillInitialSizes + children-mode
    ├── interfaces.ts         ← IResizableItem + IResizableProps + IResizableOrientation
    ├── _resize/              ← moved from flex/_resize (corvu wrappers)
    ├── index.ts              ← exports Resizable + namespace IResizable
    └── __tests__/resizable.test.tsx ← items-mode тесты из flex.test.tsx + 2-3 children-mode smoke
```

```
Call-sites migration (Flex → Layout.Resizable):
- packages/web/boost/layout/src/matrix/content.tsx          — 3 usages + 2 type-use (IFlex.IFlexItem → IResizable.IResizableItem)
- packages/web/boost/layout/src/matrix/rows/flex-row.tsx    — 1 usage + 1 type-use
- packages/web/kit/ui/src/primitives/group/group.tsx        — 1 usage (внутренний delegation)
- packages/web/kit/ui/src/primitives/group/interfaces.ts    — IFlexItem re-export если есть
- packages/web/kit/ui/src/primitives/wrappers/index.ts      — re-export `Wrapper.Resizable` → реальный Resizable, без deprecated
```

**НЕ трогаем в этом брифе:**
- `flex.manifest.tsx`, `flex.contract.ts` (нет), `flex.presets.ts` (нет) — это всё в flex-эталоне.
- `manifest/registry.ts` — Resizable в палитре пока НЕ показываем (manifest для него пока не делаем).
- `apps/playground/src/widgets/studio/canvas.tsx` — там in-progress правки user'а.
- `apps/playground/src/pages/workspace/web-studio/index.tsx` — то же.
- `packages/web/studio/src/palette/ComponentsPalette.tsx` — то же.

# Скоп и workflow

- Ветка — **`main`**, без переключений (по сигналу user'а; architect-hook `git-gate` всё равно блокирует `git push`/`git switch`).
- **Commit-only.** Push делает user.
- Pre-commit hook блокирует direct commit в main — это нормально, agent STOP + return state (architect разруливает).
- **Cross-zone.** Координирует architect. Sequential execution для устойчивости main:
  - **Phase 1 (owner-web-ui):** создать `primitives/layout/resizable/` (additive, ничего не ломает) → commit.
  - **Phase 2 (owner-boost-layout):** мигрировать Matrix на новый Resizable → commit.
  - **Phase 3 (owner-web-ui):** мигрировать Group, очистить Flex от items, обновить wrappers, перенести тесты → commit.
- На каждой Phase main green: build/test обеих зон проходят.
- Memory `feedback_no_blanket_restore` — если по дороге появятся незнакомые правки в working tree (особенно playground/* + ComponentsPalette.tsx — там user работает), STOP и эскалируй, **НЕ** `git restore .`.

# Phase 1 — owner-web-ui: создать `primitives/layout/resizable/`

## 1.1 — `interfaces.ts`

Перенести из `flex/interfaces.ts` типы `IFlexItem` (→ `IResizableItem`), `FlexOrientation` (→ `ResizableOrientation` или просто `'horizontal' | 'vertical'`), runtime-props.

```ts
import type { JSX } from 'solid-js';

export type ResizableOrientation = 'horizontal' | 'vertical';

/** Описание одной панели в Resizable. */
export interface IResizableItem {
  children: JSX.Element;
  /** Доля от общего размера (0..1). Если undefined — раздаётся равномерно среди undefined. */
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  /**
   * false → панель не участвует в resize (нет handle перед/после).
   * true (default) → handle инжектируется между resizable-соседями.
   */
  resizable?: boolean;
}

export interface IResizableProps {
  /** Массив панелей. Если задан — используется как источник правды. */
  items?: IResizableItem[];
  /** Дети как JSX — каждый верхне-уровневый элемент превращается в IResizableItem с resizable=true. */
  children?: JSX.Element;
  /** Ось распределения панелей. По умолчанию `horizontal`. */
  orientation?: ResizableOrientation;
  /** Показать grip-индикатор на handle'е. */
  withHandle?: boolean;
  /** Заблокировать pointer на handle'ах (раскладка применяется, drag нет). */
  handleDisabled?: boolean;
  /** Callback с новыми размерами при ресайзе (forwarded в corvu). */
  onSizesChange?: (sizes: number[]) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}
```

## 1.2 — `_resize/` (move)

`git mv packages/web/kit/ui/src/primitives/layout/flex/_resize packages/web/kit/ui/src/primitives/layout/resizable/_resize` (или Write + Edit при отсутствии git mv в флоу). Содержимое — corvu wrappers (`ResizableRoot`/`ResizablePanel`/`ResizableHandle`). НЕ редактируем, только перенос.

## 1.3 — `resizable.tsx`

Берём `ResizableFlex` + `StaticItemsFlex` + `fillInitialSizes` из `flex.tsx` (строки 65-154 текущего файла), добавляем children-mode и собираем единый publik `Resizable`:

```tsx
import { children, createMemo, For, type JSX, Show } from 'solid-js';
import { cn } from '@capsuletech/web-style';
import { ResizableHandle, ResizablePanel, ResizableRoot } from './_resize/primitives';
import type { IResizableItem, IResizableProps, ResizableOrientation } from './interfaces';

// fillInitialSizes — 1:1 из flex.tsx.
const fillInitialSizes = (items: IResizableItem[]): number[] => {
  const declared = items.map((it) => it.initialSize);
  const sum = declared.reduce<number>((s, v) => s + (v ?? 0), 0);
  const missing = declared.filter((v) => v === undefined).length;
  const remainder = Math.max(0, 1 - sum);
  const auto = missing > 0 ? remainder / missing : 0;
  return declared.map((v) => v ?? auto);
};

// Children-mode helper: JSX children → IResizableItem[].
// Каждый top-level child становится панелью с resizable=true (без initialSize → auto-distribute).
const childrenToItems = (resolved: unknown): IResizableItem[] => {
  const arr = Array.isArray(resolved) ? resolved : resolved == null ? [] : [resolved];
  return arr
    .filter((node) => node != null && node !== false)
    .map((node) => ({ children: node as JSX.Element, resizable: true }));
};

// ResizableInner — corvu-mode (минимум один item с resizable=true).
const ResizableInner = (props: {
  items: IResizableItem[];
  orientation: ResizableOrientation;
  withHandle?: boolean;
  handleDisabled?: boolean;
  class?: string;
  onSizesChange?: (sizes: number[]) => void;
}) => {
  const items = createMemo(() => props.items);
  const sizes = createMemo(() => fillInitialSizes(items()));

  return (
    <ResizableRoot
      orientation={props.orientation}
      class={props.class}
      onSizesChange={props.onSizesChange}
    >
      <For each={items()}>
        {(item, index) => (
          <>
            <ResizablePanel
              initialSize={sizes()[index()]}
              minSize={item.minSize}
              maxSize={item.maxSize}
              collapsible={item.collapsible}
              class="min-h-0 min-w-0 overflow-hidden"
            >
              {item.children}
            </ResizablePanel>
            <Show
              when={(() => {
                const next = items()[index() + 1];
                return !!next && item.resizable !== false && next.resizable !== false;
              })()}
            >
              <ResizableHandle
                withHandle={props.withHandle}
                disabled={props.handleDisabled}
                classList={{ 'pointer-events-none': !!props.handleDisabled }}
              />
            </Show>
          </>
        )}
      </For>
    </ResizableRoot>
  );
};

// StaticInner — items без resize (все resizable=false / отсутствует). CSS flex.
const StaticInner = (props: {
  items: IResizableItem[];
  orientation: ResizableOrientation;
  class?: string;
  style?: JSX.CSSProperties | string;
}) => {
  const dirClass = props.orientation === 'vertical' ? 'flex flex-col' : 'flex flex-row';
  return (
    <div class={cn(dirClass, props.class)} style={props.style as JSX.CSSProperties | undefined}>
      <For each={props.items}>{(item) => <div>{item.children}</div>}</For>
    </div>
  );
};

/**
 * Resizable — корневой layout-контейнер с панелями переменного размера (corvu).
 *
 * **Два способа задать панели:**
 *
 * 1. **JSX children** (рекомендуется для статичных и редактируемых case'ов):
 *    ```tsx
 *    <Resizable orientation="horizontal" withHandle>
 *      <Sidebar />
 *      <Main />
 *    </Resizable>
 *    ```
 *    Каждый top-level child становится панелью (resizable=true, auto-distribute size).
 *
 * 2. **`items` prop** (для динамических раскладок с control-over-sizes):
 *    ```tsx
 *    <Resizable
 *      orientation="horizontal"
 *      items={[
 *        { children: <Sidebar />, resizable: true, initialSize: 0.3, minSize: 0.15 },
 *        { children: <Main />, resizable: true, initialSize: 0.7 },
 *      ]}
 *      withHandle
 *      onSizesChange={persistSizes}
 *    />
 *    ```
 *
 * Если задан `items` — он source-of-truth, `children` игнорируются.
 */
export const Resizable = (props: IResizableProps) => {
  const orientation = (): ResizableOrientation => props.orientation ?? 'horizontal';

  // children → items если items не задан.
  const resolved = children(() => props.children);
  const effectiveItems = createMemo<IResizableItem[]>(() =>
    props.items !== undefined ? props.items : childrenToItems(resolved()),
  );

  const hasElements = () => effectiveItems().length > 0;
  const hasResizable = () => hasElements() && effectiveItems().some((it) => it.resizable === true);

  return (
    <Show
      when={hasResizable()}
      fallback={
        <StaticInner
          items={effectiveItems()}
          orientation={orientation()}
          class={props.class}
          style={props.style}
        />
      }
    >
      <ResizableInner
        items={effectiveItems()}
        orientation={orientation()}
        withHandle={props.withHandle}
        handleDisabled={props.handleDisabled}
        class={props.class}
        onSizesChange={props.onSizesChange}
      />
    </Show>
  );
};
```

**Watch out — children-mode auto-flag:** в children-режиме все top-level дети получают `resizable: true` неявно. Это значит панели **всегда** активные (handle между ними). Если когда-то понадобится «зафиксировать одну панель из children» — добавим compound `<Resizable.Item resizable={false}>` отдельным story. Сейчас не предмет.

**Watch out — `domainData` fallback из старого Flex:** в текущем `flex.tsx` стоит guard «если items не похоже на IFlexItem — fallback на children + warn». В Resizable этот guard НЕ нужен: это отдельный примитив, и `items` тут — обязательная семантика. Если consumer передал мусор — пусть упадёт явно, не маскируем.

## 1.4 — `index.ts`

```ts
import { Resizable } from './resizable';

export type * as IResizable from './interfaces';
export { Resizable };
export default Resizable;
```

## 1.5 — Re-export из root `index.ts` (`packages/web/kit/ui/src/index.ts`)

Добавить `Resizable` в публичный API web-ui рядом с `Flex`. Если есть `Layout` namespace (`Layout.Flex`, `Layout.Grid`) — добавить `Layout.Resizable`. Проверь как сделан `Layout.Grid`, повтори 1:1.

## 1.6 — `__tests__/resizable.test.tsx`

Перенести items-mode тесты из `flex.test.tsx` (~15 шт). Адаптировать: `Flex` → `Resizable`, `IFlexItem` → `IResizableItem`. Плюс добавить 2-3 smoke на children-mode:

- `<Resizable><A/><B/></Resizable>` рендерит 2 панели.
- `<Resizable orientation="horizontal"><A/><B/></Resizable>` — корневой root имеет `data-orientation="horizontal"` (или whatever corvu атрибут).
- `<Resizable />` (без детей и items) — пустой root без runtime-ошибок.

## 1.7 — Sanity check Phase 1

```bash
pnpm --filter @capsuletech/web-ui build
pnpm --filter @capsuletech/web-ui test
pnpm nx run-many -t typecheck --projects=@capsuletech/web-ui
```

В этой фазе Flex ещё содержит items-ветку — она работает параллельно с новым Resizable. Все старые тесты остаются green. Это намеренная overlap-фаза для безопасной миграции.

## 1.8 — Commit Phase 1

```
feat(web-ui): extract Layout.Resizable из Flex (additive, items+children)
```

# Phase 2 — owner-boost-layout: мигрировать Matrix

**Цель:** мигрировать Matrix engine с `<Flex items=…>` на `<Layout.Resizable items=…>`. API 1:1, mechanically.

**Контекст:** `@capsuletech/web-ui` теперь экспортит `Layout.Resizable` (compound namespace) + типы через `IResizable.IResizableItem`. Старый Flex ещё работает с `items` (overlap-фаза), но мы переезжаем.

## 2.1 — `packages/web/boost/layout/src/matrix/content.tsx` (3 usage'а Flex + 2 type-use)

1. Импорт в начале файла:
   - Было: `import { Flex, type IFlex } from '@capsuletech/web-ui';`
   - Стало: `import { type IResizable, Layout } from '@capsuletech/web-ui';`
2. Все `IFlex.IFlexItem` → `IResizable.IResizableItem` (2 места: return type функции, inline cast в `.map(...)`).
3. Все `<Flex orientation=…>` → `<Layout.Resizable orientation=…>` (3 usage'а, props 1:1 — `orientation`/`items`/`withHandle`/`handleDisabled`/`onSizesChange`/`class`). Закрывающий тег тоже `</Layout.Resizable>`.

## 2.2 — `packages/web/boost/layout/src/matrix/rows/flex-row.tsx` (1 usage Flex + 1 type-use)

1. Импорт:
   - Было: `import { Flex, type IFlex } from '@capsuletech/web-ui';`
   - Стало: `import { type IResizable, Layout } from '@capsuletech/web-ui';`
2. `IFlex.IFlexItem[]` → `IResizable.IResizableItem[]` в return type.
3. `<Flex orientation="horizontal" items=…>` → `<Layout.Resizable orientation="horizontal" items=…>`.

## 2.3 — НЕ трогать

- `matrix/interfaces.ts` — проверил, `IFlexItem` там не импортируется (только JSDoc-комментарий, косметика — оставить).
- `matrix/__tests__/matrix-resize.test.tsx` — тесты через DOM-assertions, type imports `IFlex` нет.
- Никакие другие файлы boost-layout.

## 2.4 — Sanity check Phase 2 (обязательно перед commit)

```bash
pnpm --filter @capsuletech/boost-layout test
pnpm --filter @capsuletech/boost-layout build
pnpm nx run-many -t typecheck --projects=@capsuletech/boost-layout
```

Все green. Если падает — STOP, диагностируй (скорее всего typo в namespace `Layout.Resizable`), не маскируй.

## 2.5 — Commit Phase 2

```
refactor(boost-layout): migrate Matrix to Layout.Resizable
```

В `main`. Без push (push делает user). Если pre-commit hook режет direct commit в main — это твоя сессия, у тебя своя авторизация на bypass; если нет — STOP и эскалируй.

**Working tree:** там untracked WIP user'а в `apps/playground/**`, `packages/web/studio/src/palette/ComponentsPalette.tsx`, `packages/web/runtime/remote/**`, `apps/universal-canvas/`, новые brief'ы в `docs/_meta/briefs/` — не трогать, не делать `git add -A`. Стейдж только 2 файла Matrix по explicit path.

# Phase 3 — owner-web-ui: мигрировать Group, очистить Flex

## 3.1 — `primitives/group/group.tsx`

Один usage `<Flex orientation={…} gap={…} items={batchItems()} withHandle={…} class={…} style={…}>` → `<Resizable orientation={…} items={batchItems()} withHandle={…} class={…} style={…}>`.

**Watch out — `gap` в Resizable:** Resizable пока не имеет gap-prop (corvu сам управляет промежутками через handle-width). Group сейчас прокидывает `gap={gap()}` в Flex items-mode — но в реальности items-mode Flex **тоже** игнорирует gap (см. таблицу в Контексте). То есть `gap` сейчас silent-ignore. После миграции уберём prop — поведение не меняется. Если Group рассчитывал на видимый gap — это уже сломано **сейчас**, фикс отдельным story.

## 3.2 — `primitives/group/interfaces.ts`

Если есть re-export `IFlexItem` — заменить на `IResizableItem` или убрать вовсе (Group не должен пробрасывать наружу).

## 3.3 — Очистка `flex.tsx`

Удалить (строки в текущем `flex.tsx`):

- `import { ResizableHandle, ResizablePanel, ResizableRoot } from './_resize/primitives'` (line 13).
- Типы `IFlexItem` в импорте (line 20 — оставить только `IFlexProps`).
- `fillInitialSizes` (65-72), `ResizableFlex` (89-133), `StaticItemsFlex` (146-154), `IResizableFlexProps` (78-87), `IStaticItemsFlexProps` (139-144).
- В `splitProps` (187-210) — убрать `'items'`, `'withHandle'`, `'handleDisabled'`, `'onSizesChange'`.
- Всю items-ветку (219-283) — целиком.
- Убрать `orientation` использование для items, но **сохранить** для CSS-flex direction-mapping (через `ORIENTATION_DIR`).
- `_resize/` папка уже переехала в Phase 1.1.2 → её больше нет в `flex/`.

Результат: Flex.tsx ~150 строк вместо 354, чистый CSS-flex.

## 3.4 — Очистка `flex/interfaces.ts`

Удалить из `IFlexOwnProps`:

- `items?: IFlexItem[]`
- `withHandle?`
- `handleDisabled?`
- `onSizesChange?`

Удалить export `IFlexItem` (он переехал в `resizable/interfaces.ts` как `IResizableItem`).

`FlexOrientation` — оставить, используется в CSS-flex direction-mapping.

## 3.5 — Очистка `flex.test.tsx`

Удалить items-mode тесты (они в `resizable.test.tsx` уже). По текущему файлу — строки 100-340 (items + items-domainData-fallback + onSizesChange) и 521-637 (sizing-через-items + withHandle handle-element тесты). Оставить только CSS-flex (orientation/direction/wrap/align/justify/gap/sizing-через-children/fluid/empty/polymorphism).

## 3.6 — Очистка `flex.stories.tsx`

Удалить items+resizable-story (line 93-95 + контекст). Оставить CSS-flex stories.

## 3.7 — `wrappers/index.ts`

Сейчас `Wrapper.Resizable` re-exports Flex как deprecated. Заменить на честный re-export реального `Resizable` (без `@deprecated`):

```ts
import { Resizable as ResizableImpl } from '../layout/resizable';
import { Status } from './status';

type WrapperWithStaticProps = {
  Status: typeof Status;
  Resizable: typeof ResizableImpl;
};

const Wrapper = {} as WrapperWithStaticProps;
Wrapper.Status = Status;
Wrapper.Resizable = ResizableImpl;

export type {
  ResizableOrientation,
  IResizableItem,
} from '../layout/resizable/interfaces';
export { ResizableImpl as Resizable, Status, Wrapper };
```

Старые aliases `ResizableOrientation` / `IResizableItem` теперь указывают на реальные типы (а не на FlexOrientation/IFlexItem). Без `@deprecated`.

## 3.8 — Sanity check Phase 3

```bash
pnpm --filter @capsuletech/web-ui build
pnpm --filter @capsuletech/web-ui test
pnpm --filter @capsuletech/boost-layout test
pnpm --filter @capsuletech/web-studio test
pnpm nx run-many -t typecheck --projects=@capsuletech/web-ui,@capsuletech/boost-layout,@capsuletech/web-studio
```

Все green. Старые тесты Flex не должны падать на отсутствие items API — они должны быть либо удалены (items-related), либо относиться к CSS-flex (продолжают работать).

## 3.9 — Commit Phase 3

```
refactor(web-ui): remove items-mode from Flex, point wrappers.Resizable to real impl
```

# Чего НЕ делать

- НЕ создавать `resizable.manifest.tsx` / `resizable.contract.ts` / `resizable.presets.ts` / `README.md` — это эталон-флоу, отдельным брифом после Flex-эталона.
- НЕ регистрировать `ResizableManifest` в `manifest/registry.ts` — в палитре Resizable пока не появляется.
- НЕ трогать `flex.manifest.tsx` — он остаётся как был (старого образца). Эталон Flex переписывает его отдельно.
- НЕ переключать ветку, НЕ пушить — `main`, commit-only.
- НЕ запускать `git restore .` / `git checkout -- .` (memory `feedback_no_blanket_restore`). Незнакомые правки в playground/canvas + ComponentsPalette.tsx — STOP и эскалируй.
- НЕ менять API Resizable относительно текущего Flex items-mode (orientation/items/withHandle/handleDisabled/onSizesChange) — миграция должна быть mechanically 1:1 (плюс новый children-mode сверху, opt-in).
- НЕ добавлять gap в Resizable в этом брифе. Если Group на это надеялся — это уже сломанное поведение (см. Phase 3.1), фикс отдельным story.

# Acceptance

**Phase 1 (owner-web-ui):**
- ✅ `primitives/layout/resizable/{resizable.tsx,interfaces.ts,index.ts}` созданы.
- ✅ `_resize/` перенесён из flex в resizable.
- ✅ `__tests__/resizable.test.tsx` содержит items-mode тесты (адаптированные) + 2-3 children-mode smoke.
- ✅ `Resizable` re-exported в root `index.ts` (и в `Layout.*` namespace если он есть).
- ✅ web-ui build + test green, typecheck clean.
- ✅ Flex продолжает работать в items-mode (overlap-фаза).
- ✅ commit с subject `feat(web-ui): extract Layout.Resizable из Flex (additive, items+children)`.

**Phase 2 (owner-boost-layout):**
- ✅ Matrix мигрирован: `content.tsx` (3 usages + 2 type-use), `rows/flex-row.tsx` (1 usage + 1 type-use).
- ✅ Импорт через `Layout.Resizable` + `IResizable.IResizableItem` namespace.
- ✅ `matrix/interfaces.ts` и `matrix/__tests__/matrix-resize.test.tsx` НЕ трогали (там нет import'а `IFlex`).
- ✅ boost-layout build + test green, typecheck clean.
- ✅ commit с subject `refactor(boost-layout): migrate Matrix to Layout.Resizable`.

**Phase 3 (owner-web-ui):**
- ✅ Group мигрирован: `group.tsx`, `interfaces.ts` (если требовалось).
- ✅ `flex.tsx` очищен: items-ветка, ResizableFlex/StaticItemsFlex/fillInitialSizes удалены; ~150 строк вместо 354.
- ✅ `flex/interfaces.ts` очищен: IFlexItem/items/withHandle/handleDisabled/onSizesChange убраны.
- ✅ `flex.test.tsx` без items-mode тестов.
- ✅ `flex.stories.tsx` без items-story.
- ✅ `wrappers/index.ts` указывает на реальный Resizable, без `@deprecated`.
- ✅ Все 4 пакета green: web-ui build+test, boost-layout build+test, web-studio test, typecheck clean.
- ✅ commit с subject `refactor(web-ui): remove items-mode from Flex, point wrappers.Resizable to real impl`.

**End-state (после 3 коммитов):**
- ✅ Flex принимает только `children` (CSS-flex), весь его API работает на любом ребёнке.
- ✅ Resizable принимает `items` (для control) или `children` (для простоты + canvas-friendly), corvu внутри.
- ✅ `Wrapper.Resizable` теперь честный (без deprecated).
- ✅ Matrix + Group мигрированы.
- ✅ Палитра студио не меняется (Resizable пока без манифеста).

# Workflow

- Ветка — `main`, без переключений.
- Pre-commit hook блокирует commit в main → agent STOP + return state. Architect разруливает (он авторизован user'ом коммитить в main вручную).
- Phase 1 → Phase 2 → Phase 3 строго последовательно (main green между фазами).
- Перед announce «готово» каждой фазы прогнать соответствующий sanity-check из брифа.
- Push — за user'ом, после verify всех 3 коммитов.

# Связанное

- `docs/_meta/briefs/flex-etalon.md` — будет упрощён после этого брифа (вся items-секция уходит).
- `docs/_meta/briefs/toggle-etalon.md`, `docs/_meta/briefs/typography-etalon.md` — параллельные эталон-брифы.
- `packages/web/kit/ui/src/primitives/layout/flex/flex.tsx` — источник, отсюда вытаскиваем.
- `packages/web/kit/ui/src/primitives/layout/flex/_resize/primitives.tsx` — corvu wrappers, переезжают.
- `packages/web/boost/layout/src/matrix/content.tsx` — главный consumer items-mode.
- memory `feedback_canon_modules_no_crutches` — PRIORITY 0 (модули, не монолит — items+css-flex в одном Flex был именно монолит).
- memory `feedback_agents_commit_only_user_pushes` — commit-only флоу.
- memory `feedback_no_blanket_restore` — playground/canvas + ComponentsPalette в WIP user'а, не трогаем.
- memory `feedback_workspace_split_main_vs_user_agents` — cross-zone координируется architect'ом.
