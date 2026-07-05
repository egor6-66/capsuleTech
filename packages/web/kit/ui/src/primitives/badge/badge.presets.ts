import { cva } from '@capsuletech/web-style';

/**
 * Badge presets — токен-композиция ВИДА бейджа (рычаг №1 канона
 * product-wide kit layering).
 *
 * Пресеты `tone`/`size` = композиция **замороженных** токенов/вариантов (ADR 042),
 * НЕ новые классы. Один компонент покрывает два подвида:
 *
 * - **Статический** (`interactive: false`, дефолт) — inline-пилюля с лейблом.
 *   Заменяет хендролл `Card padding="sm" + Typography size="sm" tone="muted"`.
 * - **Интерактивный чип** (`interactive: true`) — кликабельный chip с hover/focus
 *   и `selected`-подсветкой (accent). Заменяет rule-chip / `WordChip`.
 *
 * `selected` overrides `tone` через compound-variant (accent-акцент активного чипа)
 * — twMerge оставляет последний конфликтующий `bg-*`/`text-*` (createStyle → cn).
 */
export const badgeCva = cva(
  [
    // layout — inline-пилюля, лейбл в одну строку
    'inline-flex items-center justify-center gap-1 whitespace-nowrap',
    // shape / typography
    'rounded-md font-medium',
    // focus — базовый reset; кольцо навешивает interactive-вариант
    'outline-none',
  ].join(' '),
  {
    variants: {
      tone: {
        default: 'bg-secondary text-secondary-foreground',
        muted: 'bg-muted text-muted-foreground',
        outline: 'border border-input text-foreground',
        accent: 'bg-primary text-primary-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
      },
      // Кликабельный чип: cursor + переход цвета + двухслойный focus-ring (shadcn-канон).
      interactive: {
        true: 'cursor-pointer transition-colors duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        false: '',
      },
      selected: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      // Интерактивный, но не выбранный — hover-аффорданс (accent-поверхность).
      {
        interactive: true,
        selected: false,
        class: 'hover:bg-accent hover:text-accent-foreground',
      },
      // Выбранный чип — accent-акцент поверх любого tone (twMerge: последний bg/text wins).
      {
        interactive: true,
        selected: true,
        class: 'bg-primary text-primary-foreground',
      },
    ],
    defaultVariants: {
      tone: 'muted',
      size: 'sm',
      interactive: false,
      selected: false,
    },
  },
);
