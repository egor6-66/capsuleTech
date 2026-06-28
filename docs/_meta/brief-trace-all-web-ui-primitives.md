# Brief — observability: трейс mount/dispose во ВСЕХ примитивах web-ui (owner @capsuletech/web-ui)

**ADR:** [[062-runtime-observability-trace-channel]]. **Зона:** `packages/web/kit/ui/src/primitives/**` (+ `composites/**`). **Приоритет: P1** (observability-покрытие пакета + системная проверка bug A).

## Зачем

Bug A (один `<Remote.View>` → 2 `RemoteComponent` → дубль-receive) до сих пор локализуется **руками** — бисекцией app-композиции (убрать Flex / убрать Button / убрать Widget). Это ровно тот анти-паттерн, против которого построен trace-канал ([[feedback_trace_missing_node_not_remove]]). Ручные замеры **противоречат друг другу**: в одних случаях дубль исчезает без Flex, в других — держится в Widget даже без Flex. Разрешить можно только **сплошным трейсом**: каждый примитив сам сообщает mount/dispose, и один дамп показывает, какой узел инстанцируется дважды.

Прецедент-эталон: web-core layer-wrappers покрыты mount/dispose (commit `e3aa19aa`, node `web-core.<layer>`). Делаем то же для слоя ниже — UI-примитивов.

## Что сделать

### 1. Общий helper (один на пакет)

Заведи тонкий хелпер (напр. `src/internal/useTrace.ts` или в существующем utils-модуле):
```ts
import { trace } from '@capsuletech/web-profiler/trace';
import { createUniqueId, onCleanup } from 'solid-js';

/** Постоянная mount/dispose-инструментация примитива (ADR 062). No-op когда trace off. */
export const useTrace = (node: string, data?: Record<string, unknown>) => {
  const id = createUniqueId();
  trace(node, 'mount', { id, ...data });
  onCleanup(() => trace(node, 'dispose', { id, ...data }));
};
```
- Импорт `@capsuletech/web-profiler/trace` (субпат, как в web-core/web-remote — фреймворк-пакеты импортят норм, это эталон).
- `node` = `web-ui.<primitive>` (kebab/lower, консистентно: `web-ui.flex`, `web-ui.grid`, `web-ui.slot`, `web-ui.button`, `web-ui.input`, …).

### 2. Вставить вызов в тело КАЖДОГО примитива

Первой строкой компонент-функции (per-instance), как `page.tsx`/`view.tsx` в web-core:
```ts
export const Flex = (props) => {
  useTrace('web-ui.flex');
  // ...
};
```

Покрыть **все** `primitives/**` (Button, Input, Label, Card, Field, Flex, Grid, Layout, List, Navigation/Group, Separator, Toggle, Typography, **Slot**, Wrappers, Accordion, Dropdown, Select, Slider, Skeleton, Spinner, Table, Textarea, Tooltip, Map/Chart/FlowDiagram если живые) и ключевые `composites/**` (DataTable, Menu, …). **Slot — обязательно** (через него рендерят Flex/Grid и др. полиморфные обёртки; это shared-чокпойнт, где удвоение детей всплывёт).

- Уровень `debug`. No-op когда канал off. Логику примитивов **НЕ менять**.
- Где дёшево — добавь различитель в data (`as`/variant/`slot`), но `id` достаточен.

### 3. Системно проверить bug A в Flex (НЕ чинить в этом брифе)

Подозреваемый корень (подтвердить/опровергнуть трейсом, **фикс — отдельным брифом после замера**):
`flex.tsx` инстанцирует детей **дважды**:
- `:105` `const resolved = children(() => props.children)` — резолв для `isEmpty()`, в DOM не вставляется (owner #1);
- `splitProps` не выделяет `children` → он остаётся в `others`;
- `:151` `<Slot {...others} />` тащит сырой `children` → Slot инстанцирует второй раз (owner #2).

После инструментации это будет видно в дампе напрямую: `web-ui.slot:mount` под Flex даст явное число, и любой effectful потомок (`remote.component`) удвоится ровно там, где лишний owner. **Проверь тот же паттерн `children(()=>props.children)` + `{...others}` в Grid и других Slot-обёртках** — отметь находки в ответе. Сам фикс пока НЕ делай.

## Что покажет

Один дамп после клика Store: полный mount-tree UI-слоя. `web-ui.<primitive>:mount ×2` без парного dispose = узел-удвоитель. Снимает спор «Flex vs Widget vs Button» фактами, а не бисекцией.

## Проверка

`pnpm --filter @capsuletech/web-ui test` + `build` — верни последние строки и список затронутых файлов/нод (перечисли, какие примитивы покрыты). Stories/Storybook не ломать.

## НЕ делать

- Только trace-вызовы. Логику примитивов и Flex-фикс — НЕ трогать (фикс отдельным брифом по результату замера).
- Не трогать apps/*, web-core, web-remote.
- Push не делать — commit-only.
