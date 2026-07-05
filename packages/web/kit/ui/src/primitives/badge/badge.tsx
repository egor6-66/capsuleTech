import { createStyle } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import { badgeCva } from './badge.presets';
import type { IBadgeProps } from './interfaces';

/**
 * Badge — stateless, пресет-driven бейдж/чип.
 *
 * Дедупит хендролл-бейджи (`Card padding="sm" + Typography size="sm" tone="muted"`)
 * и rule-chip/`WordChip` в один примитив. Классы — только внутри; consumer передаёт
 * props/пресеты (канон product-wide kit layering).
 *
 * **Два подвида одним компонентом:**
 * - **Статический** (`interactive` не задан) — inline-пилюля с лейблом (`<span>`).
 * - **Интерактивный чип** (`interactive`) — `role="button"` + tabIndex + onClick +
 *   Enter/Space + `selected`-подсветка + `aria-pressed`.
 *
 * @example
 * ```tsx
 * <Badge>#core</Badge>                                  // статическая muted-пилюля
 * <Badge tone="outline">draft</Badge>
 * <Badge interactive selected onClick={pick}>#verb</Badge> // кликабельный чип
 * ```
 */
export function Badge(props: IBadgeProps) {
  useTrace('web-ui.badge'); // ADR 062
  const merged = mergeProps(
    { tone: 'muted', size: 'sm', interactive: false, selected: false } as const,
    props,
  );
  const [local, variantProps] = splitProps(
    merged,
    ['class', 'children', 'onClick'],
    ['tone', 'size', 'interactive', 'selected'],
  );

  const styleProps = mergeProps(variantProps, {
    get class() {
      return local.class;
    },
  });
  const { className } = createStyle(badgeCva, styleProps);

  const isInteractive = () => !!variantProps.interactive;
  const isSelected = () => !!variantProps.selected;

  // Клавиатурная активация чипа: Enter/Space → нативный click → onClick(MouseEvent).
  // Прокси через `.click()` даёт настоящий MouseEvent, а не cast KeyboardEvent.
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).click();
    }
  };

  return (
    <span
      class={className()}
      // data-slot — универсальный селектор-хук (test/inspector/canvas-overlay)
      data-slot="badge"
      // data-tone / data-size — test matcher + Figma-sync хуки
      data-tone={variantProps.tone}
      data-size={variantProps.size}
      data-interactive={isInteractive() ? '' : undefined}
      data-selected={isInteractive() && isSelected() ? '' : undefined}
      // Интерактивный чип: role/tabIndex/keyboard/aria-pressed — только при interactive.
      role={isInteractive() ? 'button' : undefined}
      tabIndex={isInteractive() ? 0 : undefined}
      aria-pressed={isInteractive() ? (isSelected() ? 'true' : 'false') : undefined}
      onClick={isInteractive() ? local.onClick : undefined}
      onKeyDown={isInteractive() ? handleKeyDown : undefined}
    >
      {local.children}
    </span>
  );
}
