# Fix — Accordion/SelectableItem type errors (scope `ui`)

**Ревью поймал:** `nx run @capsuletech/web-ui:typecheck` красный (build проходит, tsc — нет → завалит CI; shell/learn красные downstream). Два корневых type-бага в коммите `070158ae`.

## 1. `accordion.tsx:32` — createContext default тип
`createContext<Accessor<AccordionDensity>>(() => 'default')` — стрелка выводится как `() => string`, не `() => AccordionDensity` → TS2769 (no overload). Каскадит в `:138` (`density()` → TS2722 «invoke undefined», т.к. тип контекста сломан).

Фикс — аннотировать возврат:
```ts
const AccordionDensityContext = createContext<Accessor<AccordionDensity>>(
  (): AccordionDensity => 'default',
);
```
Это чинит ОБЕ ошибки (32 + 138).

## 2. `selectableItem.tsx:57` — icon тип узкий
`<Dynamic component={icon()} class="size-4 shrink-0" aria-hidden="true">` — TS2322: `icon` типизирован как `Component` (props `{}`), а передаём `class`/`aria-hidden`.

Фикс — расширить тип `icon` в `list/interfaces.ts` (`ISelectableItemProps`) до svg-пропсов (как lucide-иконки):
```ts
import type { Component, ComponentProps } from 'solid-js';
// ...
icon?: Component<ComponentProps<'svg'>>;
```

## Verify
`nx run @capsuletech/web-ui:typecheck --skip-nx-cache` — зелёный. (Тогда shell/learn typecheck тоже позеленеют — они были красные только каскадом.)

**Урок:** build ≠ typecheck. Перед коммитом kit-примитива с новыми дженериками/context — гонять `:typecheck`, не только `:build`.
