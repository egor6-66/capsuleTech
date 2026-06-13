---
tags: [ui, primitive, skeleton]
status: documented
last_updated: 2026-06-01
---

# Skeleton

Статическая заглушка для состояний загрузки. Заполняет контейнер тем же визуальным силуэтом, что реальный контент (текст, таблица, список, карточка или карта). Пульсирует мягко (`animate-pulse-subtle`).

Файлы: `packages/web/ui/src/primitives/skeleton/`. Subpath export: `@capsuletech/web-ui/skeleton`.

**Под капотом:** каждый блок-шард это `@kobalte/core` `Skeleton.Root` (`import { Root as SkeletonRoot } from '@kobalte/core/skeleton'`) — он даёт `role="group"`, `data-animate`/`data-visible` и a11y-id. Наш слой добавляет только layout-пресеты вариантов (text/table/list/card/map) + pulse-стиль (`animate-pulse-subtle`). Механику не реализуем с нуля — берём из уже подключённой либы (kobalte-first).

## Когда использовать

- Fallback при загрузке контента (передай как second аргумент в `Widget()` — loader).
- Placeholder пока идёт запрос от API (асинхронная Feature).
- Когда нужна «skeleton screen» вместо спиннера — визуально уточняет ожидаемую форму.

Используй **Skeleton**, а не **Spinner**, если контент занимает большую площадь или должна быть видна структура (таблица, список, карточка).

## API

| Prop | Тип | Default | Описание |
|---|---|---|---|
| `variant` | `'text' \| 'table' \| 'list' \| 'card' \| 'map'` | `'text'` | Форма заглушки. |
| `rows` | `number` | зависит от `variant` | Кол-во строк/блоков. Для `card` и `map` игнорируется. |
| `class` | `string` | — | Доп. Tailwind-классы. |
| `style` | `JSX.CSSProperties \| string` | — | Inline-стили. |
| `...rest` | DOM-атрибуты | — | `id`, `aria-*`, `data-*`, … |

## Варианты

| Variant | Назначение | Default rows |
|---|---|---|
| `text` | Текстовые блоки (параграфы, заголовки). | `3` |
| `table` | Таблица с header + data rows. Заполняет `h-full w-full`. | `8` |
| `list` | Список элементов с avatar + text (как в навигации или комментариях). | `5` |
| `card` | Одна карточка с header-зоной + body. | `1` (не имеет значения) |
| `map` | Полноэкранная карта. Заполняет `h-full w-full`. | `1` (не имеет значения) |

## Примеры

**Текстовый skeleton (по умолчанию):**
```tsx
<Skeleton />
```
Два блока по ширине контейнера + один узкий (последний в группе текста).

**Таблица, 10 строк:**
```tsx
<Skeleton variant="table" rows={10} />
```
Заголовок + 10 строк данных. Каждая row ~ 36px (стандартная высота table-row).

**Список людей (4 элемента):**
```tsx
<Skeleton variant="list" rows={4} />
```
4 блока с avatar-кругом + две text-строки в каждом.

**Карточка:**
```tsx
<Skeleton variant="card" />
```
Header-зона (заголовок + описание) + body (три text-блока).

**Карта:**
```tsx
<Skeleton variant="map" />
```
Единый прямоугольник, заполняет весь контейнер (`h-full w-full`).

**С доп. стилизацией:**
```tsx
<Skeleton variant="list" rows={5} class="rounded-lg" />
```

## В контексте Widget-loader

Обычно Skeleton используется как второй аргумент (loader) в `Widget()`:

```tsx
Widget(
  (Ui, store) => <Ui.DataTable data={incidents()} columns={cols} />,
  (Ui) => <Ui.Skeleton variant="table" rows={8} />
)
```

Когда Feature вызывает `store.setLoading(true)`, Widget рендерит loader вместо контента. Контент никогда не монтируется, пока loading не станет false — поэтому тяжёлые компоненты (MapLibre, virtual scroll) не создаются.

## Visuals

Все блоки скелета:
- **Color:** `bg-muted` (background-secondary из темы).
- **Animation:** `animate-pulse-subtle` (мягкая пульсация, не яркая).
- **Rounded:** `rounded-md` у всех блоков, кроме map (full-bleed).
- **Spacing:** `gap-2` между строками текста, `gap-3` в lists.

Map и Table заполняют родительский контейнер (`h-full w-full`); остальные варианты `w-full` (по ширине).

## Pitfalls

- **Не путай rows с высотой.** `rows={8}` означает 8 *логических* элементов, высота считается как `count × itemHeight` (для table 36px, для list ~ 60px на элемент). Задай явно через `class="h-[600px]"` если нужна конкретная высота контейнера.
- **Map/Table заполняют контейнер.** Убедись, что родитель имеет `h-full` и `overflow-auto` если нужен скролл.
- **Rows для card/map** — параметр существует в API, но не влияет на render (card всегда одна, map всегда один блок).

## Связанное

- [[primitives/spinner|Spinner]] — крутящийся индикатор вместо skelton-screen.
- [[widget-loader|Widget loader]] — как добавить Skeleton в Widget.
