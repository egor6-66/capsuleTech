import { Flex } from '@capsuletech/web-ui/flex';
import { Typography } from '@capsuletech/web-ui/typography';
import { Show } from 'solid-js';
import type { IInspectorKit } from '../kit';
import type { IBooleanField } from '../types';

interface IProps {
  field: IBooleanField;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
  kit: IInspectorKit;
}

/**
 * Boolean — inline-layout: label слева, toggle справа. Так компактнее в
 * списке полей и читабельнее («Отключено: ON»). Props-only (Flex/Typography);
 * `opacity-70/50` — functional dim меток (grep-safe residual).
 */
export const BooleanField = (props: IProps) => (
  <Flex orientation="vertical" gap={1}>
    <Flex align="center" justify="between" gap={2}>
      <Typography as="span" size="xs" class="opacity-70">
        {props.field.label}
      </Typography>
      <props.kit.Toggle
        checked={!!props.value}
        onChange={props.onChange}
        disabled={props.field.disabled}
      />
    </Flex>
    <Show when={props.field.hint}>
      <Typography as="span" size="xs" class="opacity-50">
        {props.field.hint}
      </Typography>
    </Show>
  </Flex>
);
