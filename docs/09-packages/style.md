---
tags: [hca, package, style]
status: documented
---

# @capsuletech/web-style

**Расположение:** `packages/web/style/`
**Зависит от:** `clsx`, `tailwind-merge`, `class-variance-authority`, `es-toolkit`, `solid-js`

Тонкий интеграционный слой между Tailwind v4 и Solid.js для реактивной стилизации + темовая система с 12 встроенными темами и runtime-свитчером.

**Что это:** не CSS-framework, не компонент-либа. Это:
1. Хелперы для мержа Tailwind-классов и CVA-вариантов (`cn`, `cva`, `createStyle`).
2. Система CSS-переменных для тем + Tailwind-маппинг на эти переменные.
3. Компонент `ThemeSwitcher` для runtime-переключения.
4. Редактор тем (advanced).

## API

### `cn(...inputs): string`

Мерж Tailwind-классов с разрешением конфликтов:

```ts
cn('px-2 py-1', 'px-4')  // → 'py-1 px-4' (px-4 побеждает px-2)
cn('bg-red-500', undefined, 'bg-blue-500')  // → 'bg-blue-500'
```

Под капотом: `clsx` (фильтр falsy) + `tailwind-merge` (разрешение конфликтов Tailwind-утилит).

### `cva(...): CVA-функция`

Re-export `class-variance-authority` — типизированный набор вариантов:

```ts
import { cva } from '@capsuletech/web-style';

export const buttonCva = cva('inline-flex items-center', {
  variants: {
    variant: {
      primary:     'bg-primary text-primary-foreground',
      secondary:   'bg-secondary text-secondary-foreground',
      ghost:       'hover:bg-accent',
    },
    size: {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-10 px-6 text-base',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

### `createStyle(cvaFn, props): { className: () => string, style: () => JSX.CSSProperties }`

Делает CVA-результат реактивным в Solid:

```ts
const { className, style } = createStyle(buttonCva, {
  variant: props.variant,
  size: props.size,
  class: props.class,
  style: props.style,
});

return <button class={className()} style={style()} />;
```

Внутри:
- `className` — `createMemo(() => cn(cvaFn(props), props.class))`. Когда `props.variant` меняется, Solid пересчитывает только этот мемо, не весь компонент.
- `style` — просто геттер `() => props.style`.

**Почему `createMemo`:** Solid не может автоматически отследить, что `cvaFn(props)` зависит от `props.variant`. Memo явно говорит Solid: "пересчитай только если аргументы меняются".

### `merge(a, b): object`

Глубокий merge через `es-toolkit`:

```ts
merge(
  { colors: { primary: 'blue' }, size: 'md' },
  { colors: { secondary: 'red' } }
)
// → { colors: { primary: 'blue', secondary: 'red' }, size: 'md' }
```

Используется редко, в основном для объединения CSS-переменных при темизации.

### `STATUS_VARIABLES`

Набор CSS-переменных для состояний:

```ts
import { STATUS_VARIABLES } from '@capsuletech/web-style/constants';
// { '--status-success': 'oklch(...)', '--status-error': 'oklch(...)', '--status-warning': 'oklch(...)' }
```

Используй эти переменные в компонентах для визуализации success/error/warning (например, зелёная граница в успешной форме).

```tsx
<Field
  class={store.styles['error-field'] ? 'border-red-500' : 'border-border'}
  // или
  style={{ borderColor: `var(--status-error)` }}
/>
```

## Темовая система

12 встроенных тем: `black`, `damon`, `deepPurple`, `lightGreen`, `minimalNeutral`, `openprofile`, `pasteelement`, `shopifyRed`, `tiesen`, `vescrow`, `zen`. Каждая — набор CSS-переменных под селектором `[data-theme="<name>"]`.

Переключение:
1. **HTML-атрибут:** `<html data-theme="zen">` → все компоненты сразу переходят на эту тему.
2. **ThemeSwitcher компонент:** рендерит выпадающее меню для runtime-выбора + сохраняет в localStorage.
3. **Tailwind-маппинг:** в `index.css` → `@theme inline` подменяет Tailwind-токены (`bg-background` → `var(--background)` → значение из активной темы).

Подробнее: [[theming]].

## ThemeSwitcher

```tsx
import { ThemeSwitcher } from '@capsuletech/web-style/switcher';

<ThemeSwitcher />
```

Компонент с кнопкой и меню всех доступных тем. При выборе:
1. Ставит `<html data-theme="<selected>">`.
2. Сохраняет выбор в `localStorage['capsule-theme']`.
3. При reload — восстанавливает выбор из localStorage.

Темы discover'ятся автоматически через `import.meta.glob` — новые `.css` в `themes/` подхватятся без рестарта.

## Editor (advanced)

В `editor/` лежит полноценный UI-редактор тем:
- `apply.ts` — применение изменений к живому стилю.
- `export.ts` — экспорт отредактированной темы как CSS-файл.
- `oklch.ts` — операции с OKLCH-цветами (самые значащие для perceptual tuning).
- `panel/`, `preview/` — компоненты редактора.

Для текущего проекта детальная дока редактора — отдельная задача.

## Где используется

1. **@capsuletech/web-ui** — все primitives используют `createStyle` и CVA.
2. **@capsuletech/web-core/ui-kit** — lazy-импорты UI компонентов для Entity.
3. **apps/\*** — глобальный `index.css` импортирует Tailwind + темы.

## Как добавить токен в CSS-переменные

1. Отредактируй все 12 файлов в `packages/web/style/src/themes/<name>.css` — добавь строку `--my-token: oklch(...);`.
2. В `index.css` добавь маппинг в `@theme inline`:
   ```css
   --color-my-token: var(--my-token);
   ```
3. Теперь пиши `bg-my-token`, `text-my-token` и т.д.

Алтернатива: используй CSS-переменные напрямую в компоненте (`style={{ backgroundColor: 'var(--my-token)' }}`), но это не даст autocomplete в Tailwind-классах.

## Связанное

- [[ui|@capsuletech/web-ui — UI-kit primitives]]
- [[theming|Темовая система: как устроена, как добавить]]
