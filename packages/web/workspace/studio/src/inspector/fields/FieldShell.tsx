/**
 * FieldShell — общий layout одного поля Inspector'а.
 *
 * Использует kit `Field` (`@capsuletech/web-ui/field`): `Field.Label` сверху,
 * `Field.Content` — вокруг контрола, `Field.Description` — для опционального
 * hint'а. Это даёт согласованный вид с остальным UI (label / spacing /
 * disabled-state), не нужно городить самописный layout.
 *
 * `inline` — для случаев типа Toggle, когда label лежит сбоку от контрола;
 * включает horizontal orientation у Field.
 */

import { Field } from '@capsuletech/web-ui/field';
import { type JSX, Show } from 'solid-js';

interface IFieldShellProps {
  label: string;
  hint?: string;
  /** Inline-layout (label рядом с контролом, для Toggle и подобных). */
  inline?: boolean;
  children: JSX.Element;
}

export const FieldShell = (props: IFieldShellProps) => (
  <Field orientation={props.inline ? 'horizontal' : 'vertical'}>
    <Field.Label>{props.label}</Field.Label>
    <Field.Content>{props.children}</Field.Content>
    <Show when={props.hint}>
      <Field.Description>{props.hint}</Field.Description>
    </Show>
  </Field>
);
