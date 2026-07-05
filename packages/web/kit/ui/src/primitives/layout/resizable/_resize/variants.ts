import { cva } from '@capsuletech/web-style';

/**
 * Корневой контейнер Resizable. `data-orientation` ставит сам corvu —
 * Tailwind-селекторы переключают direction.
 */
// `overflow-hidden` ensures the root never expands beyond its positioned container
// (important when nested inside absolute inset-0 wrappers in Matrix layouts).
export const resizableRootCva = cva(
  'flex size-full overflow-hidden data-[orientation=vertical]:flex-col',
);

/**
 * Handle между двумя панелями. Длинная строка скопирована из shadcn/solid-ui;
 * orientation-aware варианты — через `data-[orientation=vertical]:*` (атрибут
 * ставит corvu).
 *
 * Вариант `active` — реактивная активность ручки (per-item `handleActive`
 * и/или контейнерный `handleDisabled`). Активная ручка рисует hairline единым
 * токеном `bg-border` (как Card/Input в ките — все бордеры в продукте один
 * токен). Неактивная остаётся в DOM (панели не ремоунтятся), но не рисует линию
 * (`bg-transparent`) и не принимает pointer — видимый разделитель ячеек это
 * забота консьюмера (бордер ≠ resize-аффорданс).
 */
export const resizableHandleCva = cva(
  // `relative` is load-bearing: GripIcon uses `absolute` positioning relative to
  // this element. `flex` / `items-center` / `justify-center` are intentionally
  // absent — GripIcon is out of flow, so there is no flex-child to centre.
  // Removing them prevents flex min-content from stretching the 1px handle when
  // GripIcon mounts (layout-shift fix).
  'relative w-px shrink-0 after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90',
  {
    variants: {
      active: {
        true: 'bg-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        false: 'bg-transparent pointer-events-none',
      },
    },
    defaultVariants: { active: true },
  },
);
