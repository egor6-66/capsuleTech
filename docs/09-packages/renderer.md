---
tags: [09-packages, renderer]
status: documented
type: guide
---

# 🖥️ @capsuletech/web-renderer

> [!info]
> Чистый runtime для рендера UI по JSON-схеме. Принимает дерево узлов + `registry` с компонентами по dot-path'у и эмиттит Solid JSX. Без deps на zod/manifests — design-time концерны живут в [[ui-creator|@capsuletech/web-ui-creator]].
>
> Шпаргалка для Claude — [[_meta/renderer|_meta/renderer.md]].

## Зачем

Renderer — это «обобщённый Widget» в форме библиотеки. Везде, где нужно превратить **сериализованное дерево** в живой UI, ходит этот пакет:

- **Editor preview** — `@capsuletech/web-ui-creator` рендерит то же дерево, что юзер редактирует.
- **Production CMS-runtime** — host-app получает JSON по сети (от бэка, БД, S3) и рендерит без редакторского overhead'а.
- **Storybook / docs / превью шаблонов** — отображение «эталонных» layout'ов без хардкода в коде.
- **Тестовый стенд для Controllers/Features** — собрал маленький JSON, навесил Controller — увидел поведение.

Один и тот же рантайм везде → редактор и прод **гарантированно** показывают идентичный результат.

## Quick start

```tsx
import { Renderer, type ISchema } from '@capsuletech/web-renderer';
import { Button, Card } from '@capsuletech/web-ui';

const schema: ISchema = {
  components: {
    root: 'r',
    nodes: {
      r: { id: 'r', type: 'ui.Card', parentId: null, children: ['b1'] },
      b1: {
        id: 'b1',
        type: 'ui.Button',
        parentId: 'r',
        children: [],
        props: { children: 'Click', variant: 'default' },
      },
    },
  },
};

<Renderer
  schema={schema}
  registry={{ ui: { Button, Card } }}
  mode="controlled"
/>;
```

## Структура пакета

```
packages/web/renderer/src/
├── index.ts        Renderer / resolvePath + types
├── renderer.tsx    основной компонент + RenderNode
├── resolve.ts      dot-path → component lookup в registry
└── types.ts        ISchema / IEditorNode / IInteraction / RenderMode / Registry / IRendererProps / NodeId
```

Никаких лишних абстракций — четыре файла, ~200 строк.

## RenderMode

Монотонная шкала возможностей — каждый следующий **строго ⊇ предыдущего**. Поэтому JSON, валидный в `static`, остаётся валидным в `controlled`/`full`.

| Mode | Что активно | Когда выбирать |
|---|---|---|
| `'static'` | Только `components`. `interactions` игнорируются. | Превью шаблона, статическая страница без логики, snapshot-тесты. |
| `'controlled'` (default) | `+ interactions.ref` → готовые Controllers/Features из registry. | Прод-приложение, где поведения уже написаны в коде. **Это 95% случаев.** |
| `'full'` | `+ interactions.inline` JSON FSM-конфиг. | CMS, где не-разработчик собирает поведение из визуального конструктора. **Не реализован** — ждёт `createControllerFromConfig`. |

В `controlled`-моде встретив `inline` без `ref` — renderer warn-ит в DEV и пропускает interaction.

## ISchema

Контракт данных. Stateless — никаких `selected`/`hover`/`expanded` (это редактор хранит отдельно).

```ts
interface ISchema {
  components: {
    root: NodeId;
    nodes: Record<NodeId, IEditorNode>;
  };
  interactions?: IInteraction[];
}

interface IEditorNode {
  id: NodeId;
  type: string;                          // dot-path в registry
  parentId: NodeId | null;
  children: NodeId[];                    // порядок имеет значение
  props?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  styles?: Record<string, string>;
}

interface IInteraction {
  id: string;
  nodeId: NodeId;                        // на какой узел навешено
  kind: 'controller' | 'feature';
  ref?: string;                          // dot-path: 'Controllers.Universal.Form'
  props?: Record<string, unknown>;       // пропсы wrapper'у (overrides и т.п.)
  inline?: Record<string, unknown>;      // JSON FSM (только 'full')
}
```

> [!note]
> Поле `IEditorNode.styles` пробрасывается компоненту как `props.styles: Record<string, string>`. Renderer **не интерпретирует** — host решает: смержить в `class` через `createStyle`, отдать в `style`-attr, проигнорировать. Обновления `node.styles` приходят реактивно через `mergedProps` getter (без re-mount).

> [!note]
> Поле `IInteraction.kind` опционально валидируется: если ваш wrapper-компонент выставит статический маркер `WrapperFn.__capsuleKind = 'controller' | 'feature'`, renderer сверит с `kind` из JSON и DEV-warn'нит на mismatch. Без маркера — тихо применяет wrapper. Это позволяет ловить опечатки в JSON-схемах без жёсткой связки с web-core.

> [!note]
> **DEV-валидация схемы.** Renderer на каждый mount + каждое изменение `props.schema` молча проходит по дереву и warn'ит через `console.warn`, если найдёт: отсутствующий root в `nodes`, missing child id'ы, дубликаты id в `node.children`, mismatch `node.id` vs key в `nodes`. Каждая уникальная проблема warn'ится один раз per Renderer instance (не флудит при правках в редакторе). Сам рендер не падает — renderer переживает кривой JSON, просто молча рендерит то что может.

## Registry

Рекурсивно-вложенный объект: `Registry = { [k: string]: Component<any> | Registry }`. На каждом ключе либо Component (лист), либо вложенный Registry. Renderer ходит по ключам через `resolvePath`:

```ts
const registry = {
  ui: { Button, Input, Field, Layout, /* ... */ },
  Entities: { Viewer: { LoginForm } },
  Widgets: { Forms: { Auth } },
  Controllers: { Universal: { Form } },
  Features: { /* ... */ },
};
```

Конвенция (необязательная, но удобная):
- `ui.*` — низкоуровневый kit;
- `Entities.<group>.<name>` — stateless UI;
- `Widgets.<group>.<name>` — композиция;
- `Controllers.<group>.<name>` — FSM-обёртки;
- `Features.<group>.<name>` — domain-логика.

> [!warning]
> Не клади в registry константы, utility-функции, данные — TS-тип `Registry` запрещает не-Component значения. Это не косметика, а защита от опечаток в JSON-схемах: `node.type = 'utils.generateId'` не должно резолвиться в функцию, которую Solid попытается отрендерить. Хочешь runtime-defensive — `as unknown as Registry`, но это явное declaration of intent.

В sandbox-app registry собирается из `.capsule/registry/wrappers.ts` (генерится `ExportGeneratorPlugin`'ом в [[vite-plugins]]). Передаёшь его в renderer — и любой Entity/Widget/Controller из app становится резолвимым.

## Примеры

### 1. Static preview (без поведения)

```tsx
<Renderer mode="static" schema={schema} registry={{ ui }} />
```

`interactions` игнорируются. Полезно для PDF-снапшотов, превью карточек, e-mail templates.

### 2. Controlled — готовые Controllers из app

```tsx
const schema: ISchema = {
  components: {
    root: 'form',
    nodes: {
      form: { id: 'form', type: 'Entities.Auth.LoginForm', parentId: null, children: [] },
    },
  },
  interactions: [
    {
      id: 'i1',
      nodeId: 'form',
      kind: 'controller',
      ref: 'Controllers.Universal.Form',
      props: { overrides: { submit: 'login' } },
    },
  ],
};

<Renderer schema={schema} registry={appRegistry} />;
```

Equivalent в обычном HCA-коде:

```tsx
<Controllers.Universal.Form overrides={{ submit: 'login' }}>
  <Entities.Auth.LoginForm />
</Controllers.Universal.Form>
```

Несколько interactions на одну ноду композируются «снаружи внутрь» в порядке массива:

```ts
interactions: [
  { id: 'a', nodeId: 'x', kind: 'feature', ref: 'Features.Auth' },
  { id: 'b', nodeId: 'x', kind: 'controller', ref: 'Controllers.Form' },
];
// → <Features.Auth><Controllers.Form><{node x}/></Controllers.Form></Features.Auth>
```

### 3. Editor preview

`@capsuletech/web-ui-creator` хранит дерево в `IEditorTree` (см. `ui-creator/src/state/types.ts`). Поля идентичны `ISchema.components.nodes[id]`, так что renderer консьюмит его без конверсии:

```tsx
const editor = createEditor(); // ваш wrapper над editor-state
<Renderer
  schema={{
    components: { root: editor.tree.root, nodes: editor.tree.nodes },
    interactions: editor.interactions,
  }}
  registry={appRegistry}
  mode="controlled"
/>
```

Правки `updateNode`/`addNode`/`moveNode` через editor-state дают новое дерево — renderer переотрендеривается **точечно** (Solid диффит через `<For>` по `node.children`), без полного re-mount.

### 4. Production CMS-runtime

```tsx
const [schema] = createResource(() => fetch('/api/pages/home').then((r) => r.json()));

<Show when={schema()} fallback={<Spinner />}>
  {(s) => <Renderer schema={s()} registry={appRegistry} mode="controlled" />}
</Show>
```

Бэк хранит JSON, фронт рендерит. Если задеплоить новый Controller в app без релиза schema — schema'а потеряет ссылку → fallback. Версионируйте.

## Fallback и обработка ошибок

```tsx
<Renderer
  schema={schema}
  registry={registry}
  fallback={(p) => <div class="text-red-500">Unknown: {p.type}</div>}
  errorFallback={({ type, nodeId, error, reset }) => (
    <div class="text-red-500">
      Failed: {type} (node {nodeId}) — <button onClick={reset}>retry</button>
    </div>
  )}
  loadingFallback={<Spinner />}
/>
```

Три независимых fallback'а:
- **`fallback`** — `node.type` не резолвится через `registry`. Default: `console.warn` + null.
- **`errorFallback`** — runtime-ошибка в компоненте ноды. Renderer оборачивает **каждый** `RenderNode` в свой `<ErrorBoundary>` — sibling isolation: бракованный компонент валит только своё поддерево, соседи живут. Default: `console.error` + null. Реквест `reset()` форсит boundary заново отрендерить ноду.
- **`loadingFallback`** — fallback для верхнеуровневого `<Suspense>` (если компонент из registry ленивый или throws-promise). Default: undefined.

## Когда **не** использовать renderer

- **Статика, известная компилятору.** Если страница в коде, не в JSON — пиши обычные HCA Page/Widget. Renderer — оверкилл.
- **SSR без гидрации.** Не пробовали; XState-машинки от Controller'ов внутри могут хотеть `window`. Если идёте в SSR — сначала проверьте на пустой схеме.
- **Если структура «всегда плоская и без поведения».** Простой `<For each={items}>{(item) => <Card {...item} />}</For>` уделает renderer по простоте.

## Roadmap

| Версия | Что |
|---|---|
| v1 (текущая) | `static` + `controlled`. Покрывает 95% юзкейсов. |
| v1.1 | Backlog в [[project-renderer-ownership]]: тесты, ErrorBoundary, дедуп warn'ов, memoization в `resolvePath`, валидация схемы. |
| v1.2 | `full`-mode (JSON FSM в `interactions.inline`). Требует `createControllerFromConfig` в `@capsuletech/web-core`. |

## Связанное

- [[ui-creator|@capsuletech/web-ui-creator]] — design-time: manifests (zod), state (операции над деревом), inspector (UI редактирования), generators (procedural UI). Runtime отделён специально — прод-апп консьюмит renderer без overhead'а редактора.
- [[core|@capsuletech/web-core]] — `Entities`/`Widgets`/`Controllers`/`Features`, которые обычно скармливаются в `registry`.
- [[ui-proxy|UiProxy]] — что происходит внутри отрендеренного Controller'а с дочерними Entity (perpetual hand-off, не задача renderer'а — он лишь гарантирует правильный Context-порядок).
- [[shape|Shape]] — фабрика data-форм. Похож по идее (декларативное описание → runtime), но Shape про данные, renderer — про UI-дерево.
- [[_meta/renderer|AI-anchor]] — терсный контракт для Claude-инстансов.
