---
tags: [meta, renderer, ai-context]
status: documented
type: ai-anchor
audience: claude
---

# 🤖 @capsuletech/web-renderer — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов. Без воды. Юзеру — [[renderer|renderer.md]].

## TL;DR

Чистый runtime для рендера UI по JSON-схеме. Принимает `ISchema` (дерево `IEditorNode` + опциональные `IInteraction`) и `Registry` (объект с компонентами по dot-path'у вроде `'ui.Button'`) и эмиттит Solid JSX. **Renderer — это «обобщённый Widget»**: композиция Entity-узлов + лениво-резолвящихся Controller/Feature-обёрток. Stateless. Без deps на zod/manifests (это уехало в [[editor]]). Версия — `controlled` (default); `static` урезает interactions; `full` (JSON FSM-конфиг) не реализован.

## Где что лежит

| Файл | Что |
|---|---|
| `packages/web/renderer/src/index.ts` | Public exports: `Renderer`, `resolvePath`, типы |
| `packages/web/renderer/src/renderer.tsx` | `Renderer`, `RenderNode`, `activeInteractions`, `DefaultFallback` |
| `packages/web/renderer/src/resolve.ts` | `resolvePath(registry, 'a.b.c')` — dot-path lookup |
| `packages/web/renderer/src/types.ts` | `ISchema`, `IEditorNode`, `IInteraction`, `RenderMode`, `Registry`, `IRendererProps`, `NodeId` |
| `packages/web/ui-creator/src/state/types.ts` | Source-of-truth для `IEditorTree`/`IEditorNode` со стороны редактора (поля идентичные, дублируются) |
| `packages/web/ui-creator/src/state/operations.ts` | Pure-операции, продюсирующие совместимый `IEditorTree` для renderer'а |

## Public API

```ts
// renderer.tsx
export const Renderer: Component<IRendererProps>;
// resolve.ts
export const resolvePath: (registry: Registry, path: string) => unknown;
// types.ts
export type { ISchema, IEditorNode, IInteraction, RenderMode, Registry, IRendererProps, NodeId };
```

`IRendererProps`:
```ts
interface IRendererProps {
  schema: ISchema;
  registry: Registry;
  mode?: RenderMode;  // default 'controlled'
  fallback?: Component<{ type: string; nodeId: NodeId }>; // default — dev-warn + null
}
```

## Render pipeline

```
Renderer(props)
  ↓ createMemo: interactionsByNode (group by nodeId, filter by mode)
  ↓ <Suspense>
  ↓ RenderNode(rootId)
    ↓ node = props.schema.components.nodes[id]   // реактивный getter
    ↓ Comp = resolvePath(registry, node.type)
    ↓ children:
        if (node.children.length === 0) → node.props.children (text leaf)
        else → <For each={node.children}>{(id) => <RenderNode id />}</For>
    ↓ inner = createComponent(Comp, mergeProps(() => node.props, { get children() {...}, get meta() {...} }))
    ↓ wrap inner with interactionsByNode[id] (thunk-chain — см. ниже)
    ↓ <>{() => wrapped()}</>  // fragment + function-child → реактивный memo
```

## Критические механики

### 1. `createComponent` вместо `<Dynamic>` (`renderer.tsx:55-61`)

`<Dynamic>` оборачивает вызов компонента в `createMemo + untrack(c(others))`. Это **ломает цепочку `useCtx()`** для Entity, рендерящихся внутри лениво-резолвящегося Controller-wrapper'а: UiProxy не подцепляется, события не доходят до Controller. **Никогда не заменять `createComponent` на `Dynamic` в renderer.tsx.**

### 2. Thunk-chain для wrapper-композиции (`renderer.tsx:122-159`)

Самое тонкое место в пакете. `createComponent(Comp, ...)` **синхронно** вызывает `Comp(props)` — то есть жадно выполняет компонент в *текущем* owner'е. Если построить inner-JSX готовым значением и потом завернуть в Wrapper:

```ts
// ❌ НЕЛЬЗЯ — Comp выполнится ДО того, как Wrapper установит Context.Provider
const inner = createComponent(Comp, ...);
return createComponent(Wrapper, { children: inner });
```

`useCtx()` внутри Entity вернёт `undefined`. Поэтому собираем **цепочку функций**:

```ts
let buildAcc = () => renderedTree();
for (let i = its.length - 1; i >= 0; i--) {
  const prev = buildAcc;
  buildAcc = () => createComponent(Wrapper, { ...props, get children() { return prev(); } });
}
```

Inner создаётся **внутри `children`-getter'а** wrapper'а — уже после того, как wrapper установил свой Context.Provider.

**Порядок:** первый interaction в массиве — самый наружный wrapper. Итерируем с конца.

### 3. Fragment + function-child для реактивности (`renderer.tsx:161-163`)

```tsx
return <>{() => wrapped()}</>;
```

Solid превращает выражение в memo и пересчитывает при изменении любого сигнала внутри `wrapped()` (в основном — `node()`, реакция на правки дерева в редакторе). Без обёртки в функцию правки не дойдут до DOM.

## RenderMode

Монотонная шкала возможностей — каждый следующий строго ⊇ предыдущего, апгрейд `static → controlled → full` не ломает JSON.

| Mode | Что активно |
|---|---|
| `'static'` | Только `components`. `interactions` игнорируются полностью. |
| `'controlled'` (default) | `+ interactions.ref` на готовые Controllers/Features из registry (v1). `inline` warn-ится. |
| `'full'` | `+ interactions.inline` JSON FSM-конфиг. **Not implemented yet** — требует `createControllerFromConfig` в `@capsuletech/web-core`. |

## Registry shape

`Registry = { [k: string]: Component<any> | Registry }` — рекурсивный type-safe тип. На каждом ключе значение — либо Component (лист), либо вложенный Registry. Renderer ходит по ключам через `resolvePath`:

```ts
const registry = {
  ui: { Button, Card, Field, ... },
  Entities: { Viewer: { LoginForm } },
  Widgets: { Forms: { Auth } },
  Controllers: { Universal: { Form } },
  Features: { ... },
};
// node.type = 'Controllers.Universal.Form' → registry.Controllers.Universal.Form
```

Cтруктура свободная; конвенция выше — то, что обычно делает host. В sandbox-app registry собирается из `.capsule/registry/wrappers.ts` (генерится `ExportGeneratorPlugin`'ом).

## Известные грабли

1. **`inline` без `full`** → DEV-warn один раз на recompute (не дедуплицирован по `id` — может флудить). См. backlog в [[project-renderer-ownership]].

2. **Незнакомый `node.type`** → fallback-компонент (если задан в props) или `DefaultFallback` с `console.warn`. Тихого падения нет, но и стопа рендера нет — соседи отрендерятся.

3. **`IInteraction.kind` валидируется best-effort.** Если wrapper-функция выставила статический маркер `__capsuleKind: 'controller' | 'feature'` — renderer сверит с `it.kind` и DEV-warn'нит на mismatch (deduped per Renderer instance). Если маркера нет — молчит, wrapper применяется как есть. Конвенция opt-in: web-core может выставить маркер в `createLogicWrapper` (2 строки), пока не выставил.

4. ✅ **`IEditorNode.styles` пробрасывается через `mergedProps`** (закрыт slot 9). Renderer не интерпретирует — отдаёт компоненту как `props.styles: Record<string, string>`. Host (Component или Controller через UiProxy/createStyle) решает как применить. Реактивно: правка `node.styles` обновляет prop без re-mount.

5. ✅ **Reactive boundary** — runtime-смены `mode`, добавление/удаление interaction'ов, swap `node.type` и `fallback` теперь корректно re-mount'ят поддерево через `renderSig` (createMemo с reducer-семантикой: return prev если материальные атрибуты не изменились) + `<For each={[renderSig()]}>` (item-identity diff). Stability для schema-props (label, children) сохранена — она идёт через `mergedProps` getter'ы и не задевает sig. См. `renderer.tsx:230-280`.

6. ✅ **Schema-validation в DEV** (`renderer.tsx:74-119`). Ловит: missing root в nodes, missing child id'ов, дубликаты id в `node.children`, `node.id` ≠ key в `nodes`. Все warn'ы deduped per-instance через `warnedSchemaIssues` Set. Walk на каждое изменение schema-ref, но каждая уникальная проблема — один warn. Editor-state на своей стороне всё ещё валидирует на edit-time; этот слой — defensive против JSON откуда угодно.

7. ~~`schema.components.root in nodes` не валидируется~~ — закрыто (см. #6).

8. ✅ **`<Suspense>` fallback** — теперь принимает `props.loadingFallback`. Default `undefined` (тихая загрузка), host опционально передаёт компонент-индикатор.

9. ✅ **`resolvePath` мемоизирует** (закрыт slot 4): per-registry `WeakMap<Registry, Map<path, resolved>>`. Misses тоже кэшируются.

10. ✅ **Registry строго типизирован** (закрыт slot 8): `{ [k: string]: Component<any> | Registry }` рекурсивно. Не-Component значения требуют explicit cast.

## Что менять когда

| Хочу… | Куда лезть |
|---|---|
| Добавить новый `RenderMode` (e.g. `'preview'`) | `types.ts > RenderMode` + расширить `activeInteractions` в `renderer.tsx:16-38` |
| Реализовать `full` mode (inline JSON FSM) | `renderer.tsx > activeInteractions` (текущий `else if (it.inline)` — здесь же), + новый `createControllerFromConfig` в `@capsuletech/web-core` |
| Поменять формат children-children-vs-prop-children | `renderer.tsx:93-98` (внутри `get children()` в `mergeProps`) |
| Изменить дефолтное поведение error-fallback'а | `renderer.tsx > DefaultErrorFallback` (или передать через props) |
| Добавить новую schema-validation проверку | `renderer.tsx > validateSchema` (новые `warn(key, msg)` с уникальным key для дедупа) |
| Кастомизировать fallback по умолчанию | `renderer.tsx > DefaultFallback` (или передать через props) |
| Поменять формат path в registry (e.g. слэши вместо точек) | `resolve.ts > resolvePath > split('.')` |
| Передавать `styles` из node компоненту | `renderer.tsx > mergeProps` — добавить getter `style`/`class` |
| Расширить kind-валидацию (e.g. на kind за пределами controller/feature) | `renderer.tsx > getKindMarker` |

## Связь с другими пакетами

- **[[ui-creator|@capsuletech/web-ui-creator]]** — design-time. `ui-creator/state/operations.ts` производит `IEditorTree`, совместимый с `ISchema.components` 1-в-1. `ui-creator/manifests` описывают компоненты на edit-time (zod-схемы, defaults, drop-валидации), renderer этого ничего не видит. `ui-creator/generators` строит схемы procedurally (то же дерево, что и manual editor).
- **[[core|@capsuletech/web-core]]** — `Entities`/`Widgets`/`Controllers`/`Features` обычно скармливаются в `registry`. Используется через `.capsule/registry/wrappers.ts` (генерится `ExportGeneratorPlugin`).
- **`UiProxy` ([[ui-proxy]])** — внутри отрендеренного Controller'а Entity автоматически проксируется. Renderer не делает ничего особенного — просто следит, чтобы Context.Provider встал ДО рендера Entity (см. thunk-chain выше).

## Re-mount строб (renderSig + `<For>`)

`renderSig` — createMemo с reducer-семантикой (return prev/next). Сравнивает только **материальные** для wrap-chain атрибуты: `node.type`, `interactions[].id+ref+kind`, `props.fallback`. Если ничего не изменилось — возвращает прежний ref → memo subscribers (включая `<For>`) ничего не видят.

`<For each={[renderSig()]}>{() => <InnerTree />}</For>` — одноэлементный массив; For диффит по item identity (===). Same ref → InnerTree остаётся mount'нутым (schema-props продолжают обновляться через `mergedProps`). New ref → For re-mount'ит → `wrapped()` пересобирает chain.

**Почему не `<Show keyed>`:** в solid-js 1.9.x `<Show keyed when={x}>{() => ...}</Show>` тоже использует function-child, который ломает ErrorBoundary catchError-границу (тот же gotcha, что с прямым function-child'ом). `<For>` с item-функцией работает корректно.

**Что НЕ триггерит re-mount:** node.props (label и т.п.), node.meta, node.children, interaction.props (внутри одной interaction'и). Эти изменения проходят реактивно через getter'ы — Controllers сохраняют XState-state, Entity не теряют DOM.

## ErrorBoundary (per-node)

Каждый `RenderNode` обёрнут в свой `<ErrorBoundary>` — sibling isolation: если конкретный Component из registry бросит исключение, fallback отрендерится **только** в этой ноде, соседи в `<For>` уцелеют.

```ts
<Renderer
  errorFallback={({ type, nodeId, error, reset }) => (
    <div class="text-red-500">Failed: {type} ({nodeId}) — <button onClick={reset}>retry</button></div>
  )}
/>
```

Default — `DefaultErrorFallback` в `renderer.tsx:25-30`: `console.error` + `null`.

**Подводный камень solid-js 1.9.x:** `<ErrorBoundary>{() => wrapped()}</ErrorBoundary>` не ловит synchronous throw из function-child. Поэтому inner `wrapped()` обёрнут в промежуточный `InnerTree` компонент — его render computation lives inside boundary'а, `catchError` срабатывает. См. `renderer.tsx:213-241`.

## `__capsuleKind` convention (opt-in)

Wrapper-функция (Controller / Feature) **может** выставить статический маркер:

```ts
function LogicWrapper(props: IWrapperProps) { /* ... */ }
LogicWrapper.__capsuleKind = 'controller'; // или 'feature'
```

Renderer проверяет маркер через `getKindMarker` (`renderer.tsx:52-69`):

- маркер совпадает с `IInteraction.kind` → тишина;
- маркер не совпадает → один DEV-warn per Renderer instance + ID (`warnedKindMismatch` Set), wrapper применяется как есть;
- маркера нет → тишина (не ломаем сценарии с произвольными host-компонентами).

Web-core сейчас маркер НЕ выставляет (2026-05-18). Когда выставит — JSON-схемы с опечатками `kind` начнут ловиться автоматически.

## Контракт для host

1. `schema.components.nodes` — flat-map nodeId → node. Дети — массив `id` в `node.children`, порядок значим.
2. `node.type` — dot-path, должен резолвиться через `registry`. Иначе fallback.
3. `interactions[].nodeId` — на какой узел навешен wrapper. Wrapper применяется к ноде И её поддереву (внутри `children`).
4. Несколько interactions на одну ноду → wrap order — массив порядок, первый — наружный.
5. `interactions[].ref` — обязателен в `controlled` mode. `inline` — для `full`.

## Тесты

`packages/web/renderer/src/__tests__/` — 27 тестов (vitest + jsdom + `vite-plugin-solid`):

- `resolve.test.ts` (8) — dot-path lookup, edge-cases (пустой путь, отсутствующие сегменты, intermediate=null).
- `renderer.test.tsx` (19) — basic rendering / fallback / reactivity (правка schema-signal → точечный re-render) / interactions (single + multi + unresolved + props) / **thunk-chain Context-regression** (3 теста, в т.ч. multi-wrapper и deep-tree) / RenderMode фильтрация.

Запуск: `pnpm --filter @capsuletech/web-renderer test`. Любые правки thunk-chain (`renderer.tsx:122-159`) — обязательно через эти тесты, особенно блок «thunk-chain preserves Wrapper Context (CRITICAL)».

## Cross-links

- User-doc: [[renderer]]
- Related: [[editor]], [[core]], [[ui-proxy]], [[controller-proxy]]
- Project memory: [[project-renderer-ownership]]
