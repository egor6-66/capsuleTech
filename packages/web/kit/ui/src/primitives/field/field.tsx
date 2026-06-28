import { createStyle } from '@capsuletech/web-style';
import { mergeProps, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type { IFieldProps } from './interfaces';
import { fieldCva } from './variants';

export function Field(props: IFieldProps) {
  useTrace('web-ui.field'); // ADR 062
  const [local, variants, others] = splitProps(props, ['class', 'style'], ['orientation']);

  const styleProps = mergeProps(variants, {
    get class() {
      return local.class;
    },
    get style() {
      return local.style;
    },
  });
  const { className, style } = createStyle(fieldCva, styleProps);
  return (
    // biome-ignore lint/a11y/useSemanticElements: Field is a generic grouping primitive — wrapping in <fieldset> would force a default browser legend layout we don't want; consumers compose FieldSet/FieldLegend explicitly when semantics matter.
    <div role="group" data-slot="field" class={className()} style={style()} {...others} />
  );
}
