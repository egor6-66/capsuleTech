---
tags: [hca, package, ui]
status: documented
---

# @capsuletech/web-ui

**Расположение:** `packages/web/ui/`
**Зависит от:** `@kobalte/core`, `@capsuletech/web-style`, `solid-js`, `solid-motionone`, `@corvu/resizable`

Stateless UI-kit. Это **строительные блоки** для Entity, не Entity сами по себе. 15 primitives (Button, Input, Card, Field, Grid, Flex, Layout, и др.) — типизированные обёртки над DOM с Tailwind-классами и CVA-вариантами.

## Состав

### Primitives

| Компонент | Назначение | Статус |
|---|---|---|
| **Button** | Кнопка, 4 варианта, 3 размера, polymorphic `as` | stable |
| **Input** | text/email/password/number/… | stable |
| **Label** | htmlFor связь с form controls | stable |
| **Field** | Compound: Field + Field.Label + Field.Content + Field.Error + Field.Hint | stable |
| **Card** | Compound: Card + Card.Header + Card.Title + Card.Content + Card.Footer | stable |
| **Grid** | CSS Grid с областями и динамических размерами | stable |
| **Flex** | CSS Flexbox с direction, justify, items, gap | stable |
| **Layout** | Compound: rows-engine (v2) или preset mode (`'app-shell'`). DnD + resize (гейтится layoutMode) | stable |
| **List** | Ul/li с batch mode + Shape pattern support | stable |
| **Table** | Semantic table (th/tbody/tr/td), no own scroll (parent responsibility) | stable |
| **DataTable** | TanStack Solid Table composite. Sorting, pagination, infinite scroll, selection, filtering | stable |
| **Separator** | Hr с orientation | stable |
| **Toggle** | Checkbox-like, controlled `checked` + `onChange` | stable |
| **Typography** | Polymorphic: h1/h2/p/span/…, 5 вариантов текста | stable |
| **Slot** | Polymorphic-`as` обёртка (@kobalte/core, internal) | — |

### Composites (v0.2.0+)

| Компонент | Назначение | Статус |
|---|---|---|
| **Dropdown** | Kobalte-based: trigger, content, item, sub-menus. Keyboard nav, ARIA, Portal mounting. | stable (PR #173) |
| **DropdownMenu** | Declarative menu via discriminated union API (`item`, `sub`, `separator`, `group`). Shape-friendly. | stable (PR #175) |
| **DarkModeToggle** | Toggle dark mode. State via `web-style` store. | stable (PR #176) |
| **LayoutModeToggle** | Toggle Matrix edit/view mode. State via `web-style` store. | stable (PR #176) |
| **ThemePicker** | Dropdown-based theme switcher. `mode='standalone'` (default) or `'sub'` for nesting. | stable (PR #177) |

### Wrappers

| Компонент | Назначение |
|---|---|
| **Animate** | Key-based Solid motion wrapper (Tailwind transition support) |
| **Resizable** | Corvu-based resizable container (internal, used by Layout) |

## Новое: Dropdown, DropdownMenu, Theme/Layout toggles (v0.2.0+)

### Dropdown & DropdownMenu

**Dropdown** — Kobalte-based compound с полной keyboard-поддержкой и Portal mounting:

```tsx
<Ui.Dropdown>
  <Ui.DropdownTrigger as={(props) => <button {...props}>Open menu</button>} />
  <Ui.DropdownContent>
    <Ui.DropdownItem onSelect={() => console.log('Item 1')}>Item 1</Ui.DropdownItem>
    <Ui.DropdownSeparator />
    <Ui.DropdownSub>
      <Ui.DropdownSubTrigger>Submenu</Ui.DropdownSubTrigger>
      <Ui.DropdownSubContent>
        <Ui.DropdownItem>Sub Item A</Ui.DropdownItem>
        <Ui.DropdownItem>Sub Item B</Ui.DropdownItem>
      </Ui.DropdownSubContent>
    </Ui.DropdownSub>
  </Ui.DropdownContent>
</Ui.Dropdown>
```

**DropdownMenu** — декларативный вариант для простых меню (используй Shape для списков):

```tsx
interface IDropdownMenuItem {
  type: 'item';
  label: string;
  onSelect?: () => void;
} | {
  type: 'sub';
  label: string;
  items: IDropdownMenuItem[];
} | {
  type: 'separator';
} | {
  type: 'group';
  label?: string;
  items: IDropdownMenuItem[];
}

<Ui.DropdownMenu 
  trigger={<button>Actions</button>}
  data={[
    { type: 'item', label: 'Edit', onSelect: () => handleEdit() },
    { type: 'item', label: 'Delete', onSelect: () => handleDelete() },
    { type: 'separator' },
    { type: 'item', label: 'Archive', onSelect: () => handleArchive() },
  ]}
/>
```

### DarkModeToggle, LayoutModeToggle, ThemePicker

Все используют state-stores из `web-style` (no Provider needed):

```tsx
import { useDarkMode, toggleDarkMode, useLayoutMode, setLayoutMode } from '@capsuletech/web-style';

// Simple toggle
<Ui.DarkModeToggle />  // uses useDarkMode/toggleDarkMode internally

// Layout mode (gating Matrix DnD/resize)
<Ui.LayoutModeToggle />  // uses useLayoutMode/setLayoutMode internally

// Theme picker (dropdown)
<Ui.ThemePicker />  // mode='standalone' (default)

// Nested in another dropdown
<Ui.Dropdown>
  <Ui.DropdownTrigger>Settings</Ui.DropdownTrigger>
  <Ui.DropdownContent>
    <Ui.ThemePicker mode='sub' />  // renders Dropdown.Sub instead of own Dropdown
  </Ui.DropdownContent>
</Ui.Dropdown>
```

### DataTable improvements (v0.2.0+)

Infinite scroll with fixed row height + column alignment:

```tsx
<Ui.DataTable
  data={rows()}
  columns={columns}
  infinite={{
    itemHeight: 48,    // px — default 36
    overscan: 5,       // rows rendered outside viewport
    threshold: 10,     // rows before end to trigger onLoadMore
  }}
  onLoadMore={async () => {
    const more = await api.getMore();
    setRows([...rows(), ...more]);
  }}
/>
```

Sticky header, horizontal scroll on width overflow, `whitespace-nowrap` cells.

### Matrix layoutMode gating (v0.2.0+)

Edit-affordances (DnD badges, resize handles, dashed borders) controlled by `useLayoutMode()`:

```tsx
import { useLayoutMode, setLayoutMode } from '@capsuletech/web-style';

const mode = useLayoutMode();  // 'view' | 'edit'

<Ui.Layout.Matrix 
  rows={rows}
  // layoutMode auto-read from store internally; when mode changes, affordances toggle
/>

// Toggle edit mode
<button onClick={() => setLayoutMode(mode() === 'view' ? 'edit' : 'view')}>
  {mode() === 'view' ? 'Edit layout' : 'Done editing'}
</button>
```

## Соглашения

Каждый primitive следует **единому канону**: `index.ts` + `interfaces.ts` + `variants.ts` (обязателен для кнопок/иконок, опционален для layout) + `<name>.tsx` + `<name>.stories.tsx` (обязателен).

Ключевые правила:
- **Стили через CVA + `createStyle`** из [[style|@capsuletech/web-style]]. Только темовые токены (`bg-primary`, `text-foreground`, `border-border`, …), никаких `bg-blue-500`.
- **Polymorphic `as` через `Slot`** — стандарт. `asChild` (Radix-style) больше не используем.
- **Compound-компоненты** через `Object.assign(Base, { Part })` в отдельном `parts.tsx`.
- **Stateless** — никаких `createSignal` для бизнес-логики. Допустимо только UI-only state (controlled vs uncontrolled в Toggle).

Полный канон: [[conventions]].

## Storybook

```bash
cd packages/web/ui
pnpm storybook
```

Запускается на `http://localhost:6006`. Тема-toolbar в `preview.ts` автоматически обнаруживает все темы из `[[style|@capsuletech/web-style]]` и позволяет переключаться прямо в браузере.

Подробнее: [[storybook]].

## Темы и стили

Все primitive'ы реактивны к переключению тем через `data-theme` на `<html>`. Темовая система, list тем, и как добавить новую: [[style|@capsuletech/web-style]] → [[theming]].

## Что **не** должно жить в `@capsuletech/web-ui`

- Бизнес-валидация полей — это уровень Controller/Feature.
- Знание о `meta`/`tags` — UI не знает про мета-теги. Это договор между Entity и [[ui-proxy|UiProxy]].
- Состояние формы — это `store.ctx.data`.
- API-вызовы или XState-логика — UI-kit изолирован от HCA-слоёв.

## Связанное

- [[ui-proxy|UiProxy — перехват UI-событий]]
- [[style|@capsuletech/web-style — стилизация и темы]]
- [[conventions|UI-kit канон и best practices]]
- [[layers|Слои HCA]]
