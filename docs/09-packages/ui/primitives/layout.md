---
tags: [ui, primitive, layout]
status: documented
---

# Layout

Раскладочный primitive верхнего уровня. Один компонент с props-полем `slots`, через `variant` переключает четыре геометрии (`centroid` / `standard` / `dashboard` / `holy-grail`). Включает opt-in resize через `@corvu/resizable` и анимацию main-слота на смену роута.

Файлы: `packages/web/ui/src/primitives/layout/`. Subpath export: `@capsuletech/web-ui/layout`.

```
layout/
├── interfaces.ts        LayoutSlotMap + ILayoutProps + IResizableSlotConfig
├── variants.ts          layoutCva + layoutSlots (классы под каждый слот)
├── layout.tsx           Layout = LayoutImpl + Layout.slot (identity helper)
├── switch.tsx           LayoutSwitch — приватный диспетчер по `variant`
├── standard.tsx         Standard-вариант (с opt-in vertical resize)
├── dashboard.tsx        Dashboard-вариант (с opt-in horizontal resize)
├── holy-grail.tsx       Holy-grail (opt-in resize по обеим осям)
├── slot.ts              identity helper для object-формы слота
├── utils.ts             normalizeSlot
└── layout.stories.tsx
```

> [!info]
> `Layout` — **не compound-компонент**. У него нет `Layout.Header`/`Layout.Sidebar`. Слоты передаются как JSX-ноды через одно поле `slots`. `Layout.slot` — это identity-helper для autocomplete object-формы слота, см. ниже.

## Когда использовать

- Корневая раскладка страницы (Page-уровень).
- Когда нужна одна из готовых геометрий — централизованный блок, header+main+footer, dashboard с sidebar/main/rightBar, классический «holy-grail» с пятью зонами.
- Когда хочется опционально дать пользователю ресайзить колонки/строки — drag-handles работают через corvu.

Для произвольной grid-разметки бери [[primitives/grid|Grid]] напрямую. Для одного `flex-row`/`flex-col` — [[primitives/flex|Flex]].

## API

```tsx
<Layout
  variant="centroid" | "standard" | "dashboard" | "holy-grail"
  slots={LayoutSlotMap[variant]}
  animated?: boolean | AnimateVariant
  class?: string
  style?: JSX.CSSProperties | string
  ref?: HTMLDivElement | ((el) => void)
/>
```

Тип props discriminated union по `variant` — TS подскажет правильный набор слотов для выбранного варианта.

### Слоты по вариантам

| Variant | Поля `slots` |
|---|---|
| `centroid` | `main` |
| `standard` | `header`, `main`, `footer` |
| `dashboard` | `sidebar`, `main`, `header?`, `rightBar?` |
| `holy-grail` | `header`, `left`, `main`, `right`, `footer` |

### Значение одного слота

```ts
type SlotValue = JSX.Element | IResizableSlotConfig;

interface IResizableSlotConfig {
  children: JSX.Element;
  resizable?: boolean;        // opt-in для resize-режима группы
  initialSize?: number;       // 0..1, доля от родителя
  minSize?: number;           // 0..1
  maxSize?: number;           // 0..1
}
```

- **JSX-форма** (`sidebar: <X />`) — статика, легаси-разметка, без drag-handles.
- **Object-форма** (`sidebar: { children: <X />, resizable: true }`) — даёт corvu-panel. Когда **хотя бы один** слот в группе помечен `resizable: true`, вся группа собирается в `<Resizable>`. Если у слота `resizable: false` — он становится фиксированной panel без handle сбоку.
- `Layout.slot(config)` — identity-helper, нужен только ради автокомплита TS внутри пустого `{}`. См. ниже.

## Геометрии

### `centroid` — один центрованный блок
```
┌──────────────────────────┐
│                          │
│          main            │
│                          │
└──────────────────────────┘
```
`items-center justify-center` на корне. Для login/sign-up экрана, лендингов, single-form страниц. Resize нет.

```tsx
<Layout variant="centroid" slots={{ main: <LoginForm /> }} />
```

### `standard` — header / main / footer (вертикальная колонка)
```
┌──────────────────────────┐
│         header           │
├──────────────────────────┤
│                          │
│          main            │
│                          │
├──────────────────────────┤
│         footer           │
└──────────────────────────┘
```
Для документации, блог-постов, простых страниц.

**Без resize (легаси разметка с `flex-col`):**
```tsx
<Layout
  variant="standard"
  slots={{
    header: <Header />,
    main: <Article />,
    footer: <Footer />,
  }}
/>
```

**С vertical resize** — если хотя бы один из `header`/`main`/`footer` в object-форме с `resizable: true`, все три становятся panel'ями одного вертикального `<Resizable>`:
```tsx
<Layout
  variant="standard"
  slots={{
    header: { children: <Header />, resizable: true, initialSize: 0.15, minSize: 0.08 },
    main:   { children: <Article />, resizable: true },
    footer: { children: <Footer />, resizable: true, initialSize: 0.12, minSize: 0.06 },
  }}
/>
```

### `dashboard` — sidebar + main + опциональный rightBar/header
```
┌──────────────────────────┐
│        header (опц)      │
├────────┬─────────┬───────┤
│sidebar │  main   │right  │
│        │         │  Bar  │
└────────┴─────────┴───────┘
```

**Базовая разметка:**
```tsx
<Layout
  variant="dashboard"
  slots={{
    sidebar: <Sidebar />,
    main: <Main />,
  }}
/>
```

**С header + rightBar:**
```tsx
<Layout
  variant="dashboard"
  slots={{
    header: <Header />,
    sidebar: <Sidebar />,
    main: <Main />,
    rightBar: <Inspector />,
  }}
/>
```

**С horizontal resize** — opt-in по любому из `sidebar`/`main`/`rightBar`. Header остаётся отдельной строкой над группой.
```tsx
<Layout
  variant="dashboard"
  slots={{
    header: <Header />,
    sidebar: { children: <Sidebar />, resizable: true, initialSize: 0.2, minSize: 0.12 },
    main:    { children: <Main />, resizable: true },
    rightBar:{ children: <Inspector />, resizable: true, initialSize: 0.22, minSize: 0.15 },
  }}
/>
```

Можно зафиксировать одну из боковин: `resizable: false` уберёт handle рядом с ней. См. реализацию в [dashboard.tsx](packages/web/ui/src/primitives/layout/dashboard.tsx).

### `holy-grail` — header / (left | main | right) / footer
```
┌─────────────────────────────┐
│           header            │
├──────┬───────────────┬──────┤
│ left │     main      │right │
│      │               │      │
├──────┴───────────────┴──────┤
│           footer            │
└─────────────────────────────┘
```

Внешне как dashboard, но всегда содержит **все 5 зон** и поддерживает **независимый opt-in resize на двух осях**:

- **horizontal** — `left` / `main` / `right`. Включается если хоть один из этих слотов `resizable: true`. Средняя строка становится `<Resizable orientation="horizontal">`.
- **vertical** — `header` и/или `footer`. Включается если они `resizable: true`. Внешний контейнер становится `<Resizable orientation="vertical">`.

Возможные комбинации:

| h-resize | v-resize | Что рендерится |
|---|---|---|
| ✗ | ✗ | CSS Grid c `grid-template-areas` (легче по DOM) |
| ✓ | ✗ | Header/footer фиксированы, middle = horizontal Resizable |
| ✗ | ✓ | Outer vertical Resizable, middle = flex с фиксированными боковинами |
| ✓ | ✓ | Nested: vertical Resizable снаружи, horizontal внутри |

```tsx
<Layout
  variant="holy-grail"
  slots={{
    header: { children: <Header />, resizable: true, initialSize: 0.12 },
    left:   { children: <FileTree />, resizable: true, initialSize: 0.2 },
    main:   { children: <Editor />, resizable: true },
    right:  { children: <Outline />, resizable: true, initialSize: 0.22 },
    footer: { children: <StatusBar />, resizable: true, initialSize: 0.08 },
  }}
/>
```

См. реализацию в [holy-grail.tsx](packages/web/ui/src/primitives/layout/holy-grail.tsx).

## `Layout.slot` helper

В TS объединение `JSX.Element | IResizableSlotConfig` мешает autocomplete: внутри пустого `{}` IDE показывает свойства `Node`, а не поля `{ children, resizable, ... }`. `Layout.slot` — это identity-функция, которая помогает компилятору вывести правильный тип.

```tsx
<Layout
  variant="dashboard"
  slots={{
    sidebar: Layout.slot({ children: <Sidebar />, resizable: true, initialSize: 0.2 }),
    main:    Layout.slot({ children: <Main />, resizable: true }),
  }}
/>
```

Реализация — простой `<T>(config: T): T => config` в [slot.ts](packages/web/ui/src/primitives/layout/slot.ts). На runtime ничего не делает, только подсказывает TS.

## `animated`

Оборачивает **только** `main`-слот в `<Animate>` (header/footer/sidebar обычно статичны при смене роута).

```tsx
<Layout variant="standard" animated="fade" slots={{ /* … */ }} />
```

| Значение | Поведение |
|---|---|
| `false` / `undefined` | без анимации (default) |
| `true` | дефолтный variant `'fade'` |
| `'fade' \| 'slide-up' \| 'scale' \| …` | конкретный `AnimateVariant` |

Если в дереве есть `RouterContext` (`@capsuletech/web-router`), Layout пробрасывает `keyed={router.current()}` в `Animate` — каждый раз когда меняется pathname, `<Show keyed>` пересоздаёт main-контент с анимацией перехода. Без роутера работает только initial mount-анимация.

## Recipes

| Задача | Variant | Резайз |
|---|---|---|
| Login / Sign-up экран | `centroid` | — |
| Документация, лендинг, статья | `standard` | опционально header/footer |
| Админка с боковой панелью | `dashboard` | sidebar (часто `rightBar`) |
| Файл-менеджер / IDE-like | `holy-grail` | обе оси, vertical для status-bar |
| Editor с превью справа | `dashboard` + `rightBar` | rightBar resizable |

## Storybook

`http://localhost:6006/?path=/story/components-layout--centroid` после `pnpm storybook` в `packages/web/ui/`.

Stories покрывают каждый variant + ключевые resize-режимы:
- `centroid`, `centroid · animated`
- `standard`, `standard · resizable`
- `dashboard`, `dashboard · header + rightBar`, `dashboard · resizable`, `dashboard · fixed rightBar`
- `holy-grail`, `holy-grail · horizontal resize`, `holy-grail · vertical resize`, `holy-grail · both axes`

## Pitfalls

- **`h-screen` нужен parent'у.** `dashboard` имеет `h-screen` на корне; если Layout вложен в контейнер ограниченной высоты — добавь явное `h-full` на родителе или переопредели через `class`.
- **Слот без флага `resizable` ≠ object-форма «легаси».** Object-форма без `resizable: true` визуально идентична JSX-форме — это by design (`resizable` opt-in, не auto). Если кажется что drag-handle не появился — проверь, что **оба соседних** слота помечены `resizable: true`.
- **Mixing JSX и object-формы.** Допускается. Object-форма без `resizable: true` рендерится как обычный slot. Группа уходит в resize-режим только если **хотя бы один** слот с `resizable: true`.
- **`grid-template-areas` инлайн-стилем.** В `holy-grail` (без resize) `grid-template-areas` задаётся через `style`, не Tailwind-arbitrary — Tailwind underscore-to-space конверсия ненадёжна для строковых значений с кавычками.
- **Resize в стеснённом контейнере.** Если parent уже меньше суммы `minSize` слотов — corvu всё равно сожмёт panel'и пропорционально. Это OK, но drag-handle может стать неинтерактивным. Обеспечь достаточное родительское пространство.

## Связанное

- [[primitives/grid|Grid]] — низкоуровневый CSS Grid primitive
- [[primitives/flex|Flex]] — Flexbox primitive
- [[storybook|Storybook — как писать stories]]
- [[conventions|UI-kit канон]]
