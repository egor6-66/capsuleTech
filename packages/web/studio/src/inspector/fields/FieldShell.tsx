import { Flex } from '@capsuletech/web-ui/flex';
import type { JSX } from 'solid-js';
import { Show } from 'solid-js';

interface IFieldShellProps {
  label: string;
  hint?: string;
  /** Если true, label рендерится inline (для toggle с подписью справа). */
  inline?: boolean;
  children: JSX.Element;
}

/**
 * Общий обёрточный layout для одного поля: label сверху, content под ним,
 * опциональный hint мелким шрифтом внизу. Все Field-компоненты используют
 * эту обёртку, чтобы вид был согласованным.
 */
export const FieldShell = (props: IFieldShellProps) => (
  <Flex
    orientation={props.inline ? 'horizontal' : 'vertical'}
    gap={props.inline ? 2 : 1}
    class={props.inline ? 'items-center justify-between' : undefined}
  >
    <span class="text-xs opacity-70">{props.label}</span>
    <div>{props.children}</div>
    <Show when={props.hint}>
      <span class="text-xs opacity-50">{props.hint}</span>
    </Show>
  </Flex>
);
