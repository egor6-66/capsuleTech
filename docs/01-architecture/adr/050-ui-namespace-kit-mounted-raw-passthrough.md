---
tags: [hca, adr, accepted, kit, web-core, ui-proxy, namespace]
status: accepted
date: 2026-06-14
last_updated: 2026-06-14
---

> [!success] Status
> **Accepted** — 2026-06-14. Канонизирует pattern, сложившийся в коде после PR #314 (Ui.Flow) и `feat/web-ui-icons-namespace` (Ui.Icons, в очереди на merge). Sister к [[047-frontend-architecture-zones-cycle-vendor|047]] (zone canon).

# ADR 050 — Ui.X kit-mounted namespace + UiProxy raw passthrough

## Контекст {#context}

### Pain 1 — Pkg-owned data-namespaces ломают UiProxy-семантику {#pain1}

UiProxy (`packages/web/runtime/core/src/engine/ui-proxy.tsx`) для каждого узла под `Ui.*` собирает meta-binding: `createUniqueId`, регистрацию в store, подписку на 6 events (`onClick`/`onInput`/...), inject реактивного `class`/`disabled`/`name`. Это правильно для interactive primitives (`Ui.Button`, `Ui.Input`). Но это **бессмысленно** для namespace, который агрегирует data-объекты:
- `Ui.Icons.GripVertical` — иконка (SVG-компонент), без meta-семантики, без store-state.
- `Ui.Flow.Handle` / `Ui.Flow.NodeResizer` — внутренние примитивы `@capsuletech/boost-flow` рендера, со своей семантикой.
- `Ui.Map.Source` / `Ui.Map.Layer` (планируется) — MapLibre adapter'ы.
- `Ui.Chart.Series` / `Ui.Chart.Axis` (планируется).

Прогон каждого члена namespace'а через `wrapComponent` создаёт лишний Proxy-уровень + триггерит `registerComponent` для нерелевантных узлов. Это и cost (memory + re-renders), и **смысловой шум** — иконка в дереве регистрируется как «компонент с meta».

### Pain 2 — Доступ к pkg-owned namespace без import-keyword {#pain2}

Compliance allowlist (`packages/builders/compliance/src/rules.ts`) для widget/view/page = только `solid-js`. Apps **не могут** написать:
```ts
import { GripVertical } from 'lucide-solid';
import { GripVertical } from '@capsuletech/web-ui/icons';
import { Handle } from '@capsuletech/boost-flow';
```
По канону app собирается через globals (`Ui.*` / `Views.*` / `Controllers.*` / ...). Hook-вариант (`useIcons()`, `useFlow()`) ломает Ui-симметрию — существующий `Ui.Button` доступен через namespace, а не через hook.

Нужен **единый путь** для pkg-owned namespace, который:
- ставится через `Ui.*` (симметрично с примитивами),
- не проходит через meta-binding (data-namespace, не interactive),
- остаётся tree-shake friendly (только нужные элементы попадают в bundle).

### Pain 3 — Cross-zone change не описан как канон {#pain3}

`Ui.Icons` (как и `Ui.Flow` до неё) — структурно cross-zone change:
- **Owning package** (kit или package-источник) определяет namespace content (`Icons = { GripVertical, ChevronRight, ... }`).
- **web-core** монтирует namespace в Ui-композицию (`runtime/core/src/ui-kit/imports.tsx`) + добавляет ключ в `RAW_PASSTHROUGH_KEYS` (`runtime/core/src/engine/ui-proxy.tsx`).

PR одного owner'а трогает зону другого. Без канона это читается как нарушение OWNERSHIP — нужно явно прописать pattern coordination.

## Решение {#decision}

### D1 — `RAW_PASSTHROUGH_KEYS` как whitelist namespace-узлов {#D1}

`packages/web/runtime/core/src/engine/ui-proxy.tsx` владеет `Set<string>` — `RAW_PASSTHROUGH_KEYS`. Когда `UiProxy` встречает `Ui.<Name>`, где `Name ∈ RAW_PASSTHROUGH_KEYS`, namespace возвращается **verbatim** — без `wrapComponent`-обхода, без meta-binding на потомков, без `registerComponent`.

```ts
const RAW_PASSTHROUGH_KEYS = new Set([
  'Flow',    // boost-flow primitives
  'Icons',   // web-ui curated icon set
  // Map, Chart, FlowDiagram — пополняется по мере роста pkg-owned namespace'ов
]);
```

Это и есть **single switching point**: namespace либо проходит meta-обвязку, либо raw passthrough — определяется одним set'ом.

### D2 — Namespace-content owned пакетом-источником {#D2}

Каждый member `RAW_PASSTHROUGH_KEYS` имеет **owning package** — единственный источник правды о составе namespace'а. Примеры:

| `Ui.<Name>` | Owning package | Файл |
|---|---|---|
| `Ui.Icons` | `@capsuletech/web-ui` (kit) | `packages/web/kit/ui/src/icons/registry.ts` (PascalCase `Icons` export) |
| `Ui.Flow` | `@capsuletech/boost-flow` | `packages/web/boost/flow/src/index.ts` |
| `Ui.Map` (план) | `@capsuletech/boost-map` | `packages/web/boost/map/src/index.ts` |
| `Ui.Chart` (план) | новый `@capsuletech/web-chart` | TBD |

Owner пакета-источника решает, что попадает в namespace (curated set, не auto-`export *` от 1000-элементной библиотеки). Tree-shake friendly: только зарегистрированные элементы попадают в bundle.

### D3 — Mounting через web-core composition {#D3}

`packages/web/runtime/core/src/ui-kit/imports.tsx` — kit-композиционный файл, выдаёт `Ui` глобал. Он импортирует namespace из owning-пакета и реэкспортит как `Ui.<Name>`:
```ts
import { Icons } from '@capsuletech/web-ui/icons';
import { Flow } from '@capsuletech/boost-flow';
// ...
export { Icons, Flow };
```

После добавления нового namespace **обязательно**:
1. Добавить import + re-export в `imports.tsx`.
2. Добавить ключ в `RAW_PASSTHROUGH_KEYS` в `ui-proxy.tsx`.

Без обоих шагов либо namespace недоступен в `Ui`, либо проходит через meta-обвязку (что ломает рендер data-namespace'ов).

### D4 — Cross-zone coordination как канон-pattern {#D4}

Добавление нового `Ui.<Name>` ВСЕГДА трогает **минимум две зоны**:
- Зона owning-пакета (kit / boost / web-* — namespace definition).
- Зона `@capsuletech/web-core` (mounting + RAW_PASSTHROUGH).

По OWNERSHIP это два разных owner-агента. Канон-pattern:
- **Single coordinated PR** с touch'ем обеих зон допустим, если изменение структурно одна координация (canon namespace registration).
- В PR description **обязательно** маркер `Cross-zone (web-core + <pkg>)` + acknowledgment от обеих сторон (один owner запрашивает review другого, либо главный архитектор подтверждает).
- Альтернатива (двух-PR серия): кит-side первым (export namespace), web-core-side вторым (mount + RAW_PASSTHROUGH) — допустимо, но overhead'но для маленького change'а.

### D5 — Hooks отвергнуты как альтернатива {#D5}

Рассматривался `useIcons()` / `useFlow()` hook-вариант (через HOOK_IMPORTS, как `useRouter`/`useDesktop`). Отвергнут по двум причинам:
1. **Ломает Ui-симметрию.** `Ui.Button` доступен как namespace, не hook. Делать иконки через hook — раздваивает мetal-модель потребителя («что-то Ui, что-то use*»).
2. **Hook возвращает один объект на caller-site.** Каждое использование `<Ui.Icons.GripVertical />` тривиально tree-shake'ится Rollup'ом, а `const icons = useIcons(); icons.GripVertical` создаёт closure-side bundle anchor.

Hooks остаются каноном для **runtime-сервисов** (router, desktop, ctx), не для data-namespace'ов.

## Последствия {#consequences}

### Положительные
- Pkg-owned namespace'ы получают единый канон. Авторы новых пакетов знают: «определи curated namespace, дай PR в web-core с mounting + RAW_PASSTHROUGH».
- UiProxy остаётся семантически чистым: meta-binding только для interactive primitives.
- Tree-shake работает (per-named export, не runtime-bag).
- Cross-zone coordination легитимизирована — owner-агенты не «нарушают OWNERSHIP», а следуют каноническому pattern'у.

### Отрицательные / открытые
- `RAW_PASSTHROUGH_KEYS` растёт линейно. По состоянию 2026-06-14 — 2 entry (`Flow`, `Icons`). Ожидается рост до ~5-6 (Map, Chart, FlowDiagram, возможно Charts.Series, Editor primitives). После **8 entry** рассмотреть **декларативный manifest** (каждое owning-package объявляет namespace в `package.json` поле `"capsule": { "uiNamespace": "Icons" }`, web-core читает glob'ом). Триггер migration'а — отдельный ADR.
- Каждый новый `Ui.<Name>` требует cross-zone coordination — overhead на маленьких change'ах. Принимаем как trade-off за единый канон.
- Owner-кит-пакета не имеет полного контроля над `Ui.*` именованием (имя ключа решается в web-core). Это намеренно — `Ui` glob owns web-core.

## Альтернативы (рассмотрены, отклонены) {#alternatives}

- **A. Auto-mount по naming convention.** Если кит экспортит `Icons`, web-core автоматически mount'ит как `Ui.Icons`. Отклонено — implicit поведение, ломается при name-collision'ах (два пакета экспортят `Items`).
- **B. Per-pkg manifest сейчас.** Сразу мигрировать на `package.json:capsule.uiNamespace`. Отклонено — overhead'но на 2-3 entry, premature abstraction. Запланировано как **migration trigger** при 8 entry.
- **C. Hooks (`useIcons()`, `useFlow()`).** Разобрано в D5.
- **D. Каждый Ui-namespace в своём UiProxy-расширении.** Отклонено — нет смысла плодить proxy-layers.

## Связь с другими ADR {#cross-links}

- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — zone canon (web-core / kit / boost / domain / studio).
- [[049-studio-catalog-composition-and-manifest-extension|ADR 049]] — manifest extension в kit (`IPrimitiveManifestEntry`); Ui-namespace'ы (`Ui.Icons`) попадут под catalog-палитру через manifest registry.
- [[051-hook-imports-centralized-ssot|ADR 051]] — sister-канон: runtime-сервисы через `useX()` hooks (через HOOK_IMPORTS), data-namespace'ы через `Ui.X` (этот ADR).
- [[032-package-controllers-and-useemit|ADR 032]] — `useEmit` для именованных events из package-Controller'ов. Не пересекается — это в `/controllers` subpath, не в Ui-namespace.
