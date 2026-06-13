---
tags: [hca, binding, widget, loader]
status: documented
last_updated: 2026-06-13
---

# Widget loader — fallback при загрузке

**Файлы:**
- `packages/web/core/src/wrappers/widget/wrapper.tsx` — Widget фабрика с loader-поддержкой
- `packages/web/ui/src/primitives/skeleton/` — Skeleton компонент
- `packages/web/ui/src/primitives/spinner/` — Spinner компонент

Widget может принимать **второй callback** — loader. Это stateless JSX-функция, которая рендерится вместо основного контента пока Feature/Controller выставляет сигнал загрузки.

## Концепция {#concept}

**Проблема:** при загрузке данных (async API запрос) контент может мигать, тяжёлые компоненты (карта, виртуальный скролл) создаются впустую. Хочется показать skeleton или спиннер, не монтируя основной Widget-контент.

**Решение:** Widget обёрнут в Solid's `<Show>` с conditional-render:
```tsx
<Show when={!(loader && store.loading)} fallback={loader(...)}>
  {content(...)}
</Show>
```

Ключевое свойство: **`<Show>` не монтирует неактивную ветку**, поэтому:
- Когда `store.loading === true` И loader предоставлен → рендерится только loader.
- Контент монтируется только когда `loading` становится `false`.
- Тяжёлые компоненты (MapLibre, DataTable virtual scroll) **никогда не создаются** во время загрузки.

## Использование

### Добавить loader к Widget'у

```tsx
// apps/<app>/src/widgets/tables/incidents.tsx
import { DataTable } from '@capsuletech/web-ui';
import { Shapes } from '@capsuletech/web-core';

export const IncidentsTable = Widget(
  // Content: рендерится когда loading === false
  (Ui, store) => (
    <Shapes.Tables.Incidents data={store.context.incidents} />
  ),
  // Loader: рендерится когда loading === true
  (Ui) => (
    <Ui.Skeleton variant="table" rows={8} />
  )
);
```

Signature:
```ts
Widget<P>(
  content: (Ui: WidgetUi, store: IBridge, props: P) => JSX.Element,
  loader?: (Ui: WidgetUi, props: P) => JSX.Element
): ParentComponent<P>
```

**Важно:** loader получает **только `Ui`** (и опциональный `props`), **БЕЗ `store`**. Loader — это stateless presentation-только шаблон, не может зависеть от данных.

### Feature управляет loading-сигналом

Feature (контроллер, управляющий логикой) отвечает за включение/выключение loading:

```tsx
// apps/<app>/src/features/incidents.ts
export const IncidentsList = Feature((services) => ({
  initial: 'idle',
  context: { incidents: [] as IIncident[] },
  states: {
    idle: {
      onInit: async ({ store }) => {
        store.setLoading(true);
        try {
          const data = await services.api.incidents.list();
          store.patch([{ tags: ['@context'] }], { incidents: data });
          store.set('loaded');
        } finally {
          store.setLoading(false);
        }
      },
    },
    loaded: {},
  },
}));
```

Контракт:
- `store.setLoading(true)` — Widget покажет loader.
- `store.setLoading(false)` — Widget покажет content.
- Жизненный цикл: `setLoading(true)` → async work → `finally { setLoading(false) }`.

### Выбрать подходящий loader

**Skeleton** (рекомендуется для большого контента):
```tsx
(Ui) => <Ui.Skeleton variant="table" rows={10} />
```
Показывает структуру, похожую на реальный контент.

**Spinner** (для компактного контента):
```tsx
(Ui) => (
  <div class="flex items-center justify-center gap-3">
    <Ui.Spinner size="lg" />
    <span>Загружаем...</span>
  </div>
)
```

**Кастомный контент:**
```tsx
(Ui) => (
  <div class="flex h-full items-center justify-center bg-muted rounded-lg">
    <div class="flex flex-col items-center gap-2">
      <Ui.Spinner size="lg" class="text-primary" />
      <p class="text-sm text-muted-foreground">Подождите, загружаем данные…</p>
    </div>
  </div>
)
```

## Real-world пример (ewc app)

### Feature (логика + async):
```tsx
// apps/ewc/src/features/maps/world.ts
export const WorldMap = Feature((services) => ({
  initial: 'loading',
  context: { sources: [] },
  states: {
    loading: {
      onInit: async ({ store }) => {
        store.setLoading(true);
        try {
          const sources = await services.api.map.sources();
          store.patch([{ tags: ['@context'] }], { sources });
          store.set('ready');
        } finally {
          store.setLoading(false);
        }
      },
    },
    ready: {},
  },
}));
```

### Widget (presentation + loader):
```tsx
// apps/ewc/src/widgets/maps/world.tsx
export const WorldMapWidget = Widget(
  (Ui, store) => (
    <Ui.MapView sources={store.context.sources}>
      {store.context.sources.map((s) => (
        <Ui.MapView.Source {...s} />
      ))}
    </Ui.MapView>
  ),
  (Ui) => (
    <Ui.Skeleton variant="map" />
  )
);
```

Рендер:
1. Feature запускает `store.setLoading(true)`.
2. Widget показит `<Skeleton variant="map" />` (заполняет контейнер, пульсирует).
3. MapLibre **не создаётся** — контент не монтирован.
4. Async запрос завершается → `store.setLoading(false)`.
5. Widget скрывает loader, монтирует content.
6. MapView появляется и рендерится.

## Разделение забот

| Слой | Ответственность |
|---|---|
| **Feature** | `store.setLoading(true/false)` + async работа. Не знает про UI. |
| **Widget** | Выбрать подходящий loader (Skeleton или Spinner) и рендер контента. |
| **UI (Skeleton/Spinner)** | Чистая presentation. Tailwind styling, animation. |

**Ключевое:** одна Feature может быть обёрнута в несколько Widget'ов, каждый с **собственным** loader:

```tsx
// Одна Feature - два Widget'а - два разных loader'а
const IncidentsTable = Widget(
  (Ui, store) => <DataTable data={store.context.incidents} />,
  (Ui) => <Ui.Skeleton variant="table" rows={8} />  // ← table skeleton
);

const IncidentsMap = Widget(
  (Ui, store) => <MapView markers={store.context.incidents} />,
  (Ui) => <Ui.Skeleton variant="map" />  // ← map skeleton
);

// Обе используют одну Feature:
<IncidentsTable /> // Feature управляет loading, Widget1 показит table-skeleton
<IncidentsMap />   // Один и тот же Feature, Widget2 показит map-skeleton
```

## Important: disabled input'ы во время loading

**Старое поведение (до этого релиза):** `store.loading` автоматически отключал все input'ы через UiProxy.

**Новое поведение:** `store.loading` **ТОЛЬКО** переключает Widget между loader и content. Если нужно отключить input'ы:

```tsx
const LoginForm = Feature((services) => ({
  initial: 'idle',
  context: { },
  states: {
    idle: {
      onSubmit: async ({ store }) => {
        store.setLoading(true);
        store.patch([{ tags: ['@input', '@submit'] }], { disabled: true }); // ← явно disable
        try {
          await services.api.auth.login(...);
          store.set('success');
        } finally {
          store.setLoading(false);
          store.patch([{ tags: ['@input', '@submit'] }], { disabled: false }); // ← явно enable
        }
      },
    },
    success: {},
  },
}));
```

Это **чистое разделение забот**: `setLoading` для UI-swap, `patch({ disabled })` для контроля элементов.

## Pitfalls

- **Loader не имеет доступа к store.** Не пытайся писать `(Ui, store) => ...` в loader — вторая позиция это `props`, не `store`. Loader — stateless шаблон.
- **Контент не монтируется, пока loading.** Если твой Widget полагается на side-effect'ы при mount'е контента — они произойдут только когда `loading === false`. Это намеренно и хорошо (нет зря создаваемых компонентов).
- **Loader можно опустить.** Если не передашь второй аргумент в Widget — будет обычный контент без fallback'а. `store.loading` не будет иметь визуального эффекта.

## Связанное {#related}

- [[primitives/skeleton|Skeleton]] — skeleton-screen в разных вариантах.
- [[primitives/spinner|Spinner]] — крутящийся индикатор.
- [[../05-widgets/_template|Widget wrapper]] — фабрика Widget'ов.
- [[../../04-features/_template|Feature wrapper]] — управление async и store.loading.
