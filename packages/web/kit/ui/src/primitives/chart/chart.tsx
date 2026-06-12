import { cn } from '@capsuletech/web-style';
import { mergeProps, Show, splitProps } from 'solid-js';
import type { IUiChartProps } from './interfaces';
import { chartCva } from './variants';

/**
 * Ui.Chart — light placeholder for `@capsuletech/boost-charts` heavy mirror.
 *
 * Zero engine deps. Renders a static bar-chart or line-chart glyph.
 *
 * @example
 * <Ui.Chart size="md" variant="bar" />
 * <Ui.Chart variant="line" />
 */
export const Chart = (props: IUiChartProps) => {
  const merged = mergeProps({ ariaLabel: 'Chart placeholder', variant: 'bar' as const }, props);
  const [local, others] = splitProps(merged, ['size', 'class', 'children', 'ariaLabel', 'variant']);

  return (
    <div
      role="img"
      aria-label={local.ariaLabel}
      data-state="placeholder"
      data-slot="chart"
      data-variant={local.variant}
      class={cn(chartCva({ size: local.size }), local.class)}
      {...others}
    >
      <Show
        when={local.variant === 'bar'}
        fallback={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 40"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-16 opacity-40"
            aria-hidden="true"
          >
            <polyline points="2,32 14,22 24,28 36,12 50,18 62,6" />
          </svg>
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 40"
          fill="currentColor"
          class="size-16 opacity-40"
          aria-hidden="true"
        >
          <rect x="6" y="20" width="8" height="16" rx="1" />
          <rect x="20" y="8" width="8" height="28" rx="1" />
          <rect x="34" y="14" width="8" height="22" rx="1" />
          <rect x="48" y="4" width="8" height="32" rx="1" />
        </svg>
      </Show>
      {local.children}
    </div>
  );
};
