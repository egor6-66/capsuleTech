import { cn } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';
import { useTrace } from '../../internal/useTrace';
import type { IUiFlowDiagramProps } from './interfaces';
import { flowDiagramCva } from './variants';

/**
 * Ui.FlowDiagram — light placeholder for `@capsuletech/boost-flow` heavy mirror.
 *
 * Zero engine deps. Renders a static three-node graph glyph.
 *
 * @example
 * <Ui.FlowDiagram size="lg" />
 */
export const FlowDiagram = (props: IUiFlowDiagramProps) => {
  useTrace('web-ui.flow-diagram'); // ADR 062
  const merged = mergeProps({ ariaLabel: 'Flow diagram placeholder' }, props);
  const [local, others] = splitProps(merged, ['size', 'class', 'children', 'ariaLabel']);

  return (
    <div
      role="img"
      aria-label={local.ariaLabel}
      data-state="placeholder"
      data-slot="flow-diagram"
      class={cn(flowDiagramCva({ size: local.size }), local.class)}
      {...others}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-16 opacity-40"
        aria-hidden="true"
      >
        <circle cx="14" cy="32" r="6" />
        <circle cx="50" cy="14" r="6" />
        <circle cx="50" cy="50" r="6" />
        <line x1="20" y1="30" x2="44" y2="17" />
        <line x1="20" y1="34" x2="44" y2="47" />
      </svg>
      {local.children}
    </div>
  );
};
