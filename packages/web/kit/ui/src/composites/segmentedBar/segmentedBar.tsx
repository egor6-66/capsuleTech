import { cn } from '@capsuletech/web-style';
import { For } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import { Button } from '../../primitives/button';
import { Group } from '../../primitives/group';
import type { ISegmentedBarProps } from './interfaces';
import { resolveSegmentedBarPreset } from './segmentedBar.presets';

/**
 * SegmentedBar — stateless сегмент-бар (склеенный переключатель разделов).
 *
 * Визуал вынесен из learn-копии `library/Navigation.tsx`: `Group attached` →
 * `For items` → `Button` (active=primary / inactive=ghost) + `aria-current="page"`
 * + `pointer-events-none` на активном. Классы легитимны ТОЛЬКО внутри компонента —
 * consumer передаёт props/пресеты, ноль сырых классов.
 *
 * Ничего не знает про роутер/emit: `activeId` приходит извне, клик отдаётся через
 * `onSelect`. Connected-обвязку (URL → activeId, `onSelect` → goTo/emit) держит
 * shell-слой (`@capsuletech/web-shell`).
 *
 * @example
 * ```tsx
 * <SegmentedBar items={segments} activeId={active()} onSelect={setActive} />
 * ```
 */
export function SegmentedBar(props: ISegmentedBarProps) {
  useTrace('web-ui.segmented-bar'); // ADR 062
  const preset = () => resolveSegmentedBarPreset(props.preset);

  return (
    <Group
      orientation={preset().orientation}
      variant={preset().container}
      class={props.class}
      style={props.style}
    >
      <For each={props.items}>
        {(item) => {
          const isActive = () => item.id === props.activeId;
          return (
            <Button
              variant={isActive() ? preset().active : preset().inactive}
              // active = текущий раздел: подсвечен, но не кликабелен. pointer-events-none
              // (не disabled — disabled погасил бы акцент через opacity-50).
              class={cn(isActive() && 'pointer-events-none')}
              aria-current={isActive() ? 'page' : undefined}
              onClick={() => props.onSelect(item.id)}
            >
              {item.label}
            </Button>
          );
        }}
      </For>
    </Group>
  );
}
