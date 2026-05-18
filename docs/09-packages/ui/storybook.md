---
tags: [ui, storybook]
status: documented
---

# Storybook: как писать stories для web-ui

Документация по созданию и отладке Storybook-историй для primitives в `@capsuletech/web-ui`.

## Запуск

```bash
cd packages/web/ui
pnpm storybook
```

Откроется `http://localhost:6006` (Storybook 10.3 на `storybook-solidjs-vite`). Каждая папка primitive → одна история.

**Для параллельного инстанса в другом worktree:**
```bash
pnpm storybook --port 6007
```

## Структура story-файла

Один файл `<name>.stories.tsx` рядом с компонентом:

```tsx
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Button } from './<name>';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'ghost', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { variant: 'default', size: 'md' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Small: Story = { args: { size: 'sm' } };
```

- `title: 'Components/Button'` — путь в Storybook-дереве (слева).
- `component` — типизация для `Meta` и `Story`.
- `argTypes` — контролы в UI (select, checkbox, text, color, …). Если нет explicit argType — Storybook пытается угадать.
- `args` — дефолтные значения props.
- `tags: ['autodocs']` — автогенерация Docs из JSDoc-комментариев.

## Тема-toolbar: как переключать темы

Toolbar в `preview.ts` использует `globalTypes.theme`, который автоматически сканирует `packages/web/style/src/themes/*.css` через `import.meta.glob`:

```ts
// packages/web/ui/.storybook/preview.ts
const themeModules = import.meta.glob(
  '../../style/src/themes/*.css',
  { eager: true },
);
const THEMES = Object.keys(themeModules)
  .map((p) => p.match(/([^/]+)\.css$/)?.[1] ?? '')
  .filter((n) => n && n !== 'index')
  .sort();

const preview: Preview = {
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Capsule UI theme',
      defaultValue: THEMES[0] ?? 'black',
      toolbar: {
        icon: 'paintbrush',
        items: THEMES.map((value) => ({ value, title: value })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.classList.add('dark');
      const theme = (context.globals.theme as string) ?? THEMES[0];
      document.documentElement.setAttribute('data-theme', theme);
      return <Story />;
    },
  ],
};
```

Когда пользователь кликает на тему в toolbar:
1. Storybook пишет значение в `context.globals.theme`.
2. Decorator ставит `<html data-theme="<name>">`.
3. CSS-переменные переключаются, все компоненты перерисовываются.

**Как добавить новую тему:** создай файл `packages/web/style/src/themes/<name>.css` и импортируй в `themes/index.css`. Toolbar обновится автоматически — `import.meta.glob` подхватит при следующем dev-reload.

Подробнее: [[theming]].

## Gotcha 1: Decorator и JSX-форма

**❌ Неправильно:**
```tsx
decorators: [(Story) => <div class="p-4">{Story()}</div>]
```

`Story()` — это вызов функции, которая возвращает Solid-фабрику. Solid не разворачивает фабрику, вернувшуюся из `{}` (curly braces), и получается пустой root.

**✅ Правильно:**
```tsx
decorators: [(Story) => <div class="p-4"><Story /></div>]
```

`<Story />` — это JSX-вызов. Solid распознаёт `Story` как компонент, вызывает его фабрику и рендерит результат.

**Почему:** Storybook-preview, когда оборачивает Story в decorator, проходит компонент-функцию `Story` (не результат вызова). Decorator должен рендерить её как JSX, а не как прямой вызов.

## Gotcha 2: JSX в args сериализуется в {}

**Проблема:** когда в `args` лежит JSX-нода, Storybook сериализует её через manager↔preview bridge как пустой объект `{}`.

**❌ Не работает:**
```tsx
export const WithIcon: Story = {
  args: { children: <Plus /> },
};
```

Кнопка получит `children={}`, значок не отобразится.

**✅ Работает — используй `render`:**
```tsx
export const WithIcon: Story = {
  render: (args) => <Button {...args}><Plus /> Add</Button>,
};
```

`render` выполняется в preview iframe'е (где есть Solid runtime), JSX строится там, коллизии сериализации нет.

**Ещё пример — для slot-based примитива (Layout):**
```tsx
export const Dashboard: Story = {
  render: () => (
    <Layout
      variant="dashboard"
      slots={{
        sidebar: <MockSidebar />,
        main: <MockMain />,
      }}
    />
  ),
};
```

`slots` — объект с JSX-нодами; если положить его в `args`, манагер сериализует `<MockSidebar />` в `{}` и слот окажется пустым. `render` строит JSX непосредственно в preview iframe.

## Mocks

В `primitives/_mocks.tsx` живут готовые компоненты-подставки для примеров. Файл лежит на корне `primitives/`, поэтому vite-конфиг библиотеки его игнорирует (entry-loop сканирует только директории внутри `primitives/*`).

Что доступно:
- `MockHeader`, `MockSidebar`, `MockMain`, `MockRightBar`, `MockFooter` — полноценные слот-блоки с цветным баннером сверху (название слота), реальными UI-компонентами (`Button`, `Card`, `Typography`) и темовыми токенами.
- `MockBlock` — универсальный «один слот = один блок» с тоновым параметром (`a` / `b` / `c`) для Grid/Flex/Resizable stories.

Все на темовых токенах (`bg-primary` / `bg-card` / `bg-accent` / `bg-muted`) — переключение темы в toolbar перекрашивает моки.

**Использование в story:**
```tsx
import { MockHeader, MockMain, MockSidebar } from '../_mocks';

export const Dashboard: Story = {
  render: () => (
    <Layout
      variant="dashboard"
      slots={{
        sidebar: <MockSidebar />,
        header: <MockHeader />,
        main: <MockMain />,
      }}
    />
  ),
};
```

## Советы

- **Документация:** добавь JSDoc на Props в `interfaces.ts`. Storybook с `tags: ['autodocs']` автоматически вытянет их в Docs-таб.
- **Control types:** для `disabled` используй `{ control: 'boolean' }`, для вариантов — `{ control: 'select', options: [...] }`, для сложного state — исключи из `argTypes` (только через `render`).
- **Асинхронность:** Storybook 10+ поддерживает `render: async (args) => ...` — полезно для тестирования загрузки.
- **Чёрный ящик:** нет нужды тестировать все возможные комбинации вариантов. 1 Default + N вариантов (по числу CVA-ключей) + 1-2 edge case достаточно.

## Связанное

- [[primitives/button|Button — пример простого primitive]]
- [[theming|Темы и data-theme]]
- [[conventions|UI-kit канон]]
