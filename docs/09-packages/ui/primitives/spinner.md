---
tags: [ui, primitive, spinner]
status: documented
---

# Spinner

Крутящийся индикатор загрузки. Простой, компактный, идеален для inline-операций или когда структура контента неизвестна.

Файлы: `packages/web/ui/src/primitives/spinner/`. Subpath export: `@capsuletech/web-ui/spinner`.

## Когда использовать

- Button с async-операцией — `<Button loading={isLoading()}>Send</Button>` (встроенный спиннер).
- Inline-индикатор при быстрых операциях (не хочешь skeleton-screen).
- Когда контент занимает мало места и нужен просто визуальный сигнал "идёт что-то".

Если контент большой (таблица, список, карточка) — используй [[primitives/skeleton|Skeleton]] — он явно показывает структуру.

## API

| Prop | Тип | Default | Описание |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Размер (высота/ширина в пиксах). |
| `label` | `string` | `'Loading'` | Accessible label для screen readers. |
| `class` | `string` | — | Доп. Tailwind-классы (например `text-primary`). |
| `style` | `JSX.CSSProperties \| string` | — | Inline-стили. |

## Размеры

| Size | Геометрия | Use case |
|---|---|---|
| `sm` | `h-4 w-4` | Компактно в кнопках, полях, inline. |
| `md` | `h-6 w-6` | По умолчанию, для most use cases. |
| `lg` | `h-8 w-8` | Центральный спиннер при загрузке целой section'а. |

## Примеры

**Базовый:**
```tsx
<Spinner />
```
Спиннер `md` с label "Loading".

**Маленький (inline):**
```tsx
<Spinner size="sm" />
```
В Button: `<Button><Spinner size="sm" /> Saving</Button>`.

**Большой с цветом:**
```tsx
<Spinner size="lg" class="text-primary" />
```
Принимает текущий цвет текста через `text-*` утилиту Tailwind.

**С кастомным label (для a11y):**
```tsx
<Spinner label="Fetching data..." />
```
Читается screen reader'ом: "Fetching data...".

## Visuals

- **Base style:** border-2 с transparent top (4-сторонний border, верх transparent = эффект arrow).
- **Color:** `text-muted-foreground` (неясный серый) по умолчанию, наследует `class="text-primary"` и т.п.
- **Animation:** `animate-spin` — полный оборот за 1 сек.
- **Rounding:** `rounded-full` (circle).

## Pitfalls

- **Не путай со встроенным loading Button-prop.** `<Button loading={true}>` автоматически показывает спиннер вместо children, disable кнопку и добавляет `size-4` класс. Используй вместо ручного `<Spinner size="sm" />` в Button.
- **Color наследуется.** Spinner — это просто `<span role="status">` с border и animation. Цвет border = текущий `color` (из `class="text-"` или `style={{ color }}`). `class="text-destructive"` даст красный спиннер.

## В контексте Widget-loader

Spinner можно использовать в Widget-loader, но обычно это делают внутри [[primitives/skeleton|Skeleton]] или в Layout с дополнительным текстом:

```tsx
Widget(
  (Ui, store) => <Ui.MapView .../>,
  (Ui) => (
    <div class="flex h-full w-full items-center justify-center">
      <Ui.Spinner size="lg" class="text-muted-foreground" />
      <span class="ml-3">Loading map…</span>
    </div>
  )
)
```

## Связанное

- [[primitives/skeleton|Skeleton]] — skeleton-screen для большого контента.
- [[primitives/button|Button]] — встроенный `loading` prop с автоматическим спиннером.
