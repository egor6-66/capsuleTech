import type { IPreset, IPropsRefiner } from '../types';

/**
 * TYPOGRAPHY_H1_PRESET — «Заголовок H1». Одна нода ui.Typography variant:h1.
 */
const refineH1: IPropsRefiner = (props) => ({
  ...props,
  variant: 'h1',
  color: 'default',
  children: String(props.children ?? 'Page Title'),
});

export const TYPOGRAPHY_H1_PRESET: IPreset = {
  name: 'typography-h1',
  rootCandidates: [{ type: 'ui.Typography', weight: 1, refineProps: refineH1 }],
};

/**
 * TYPOGRAPHY_PARAGRAPH_PRESET — «Параграф». Одна нода ui.Typography variant:p.
 */
const refineParagraph: IPropsRefiner = (props) => ({
  ...props,
  variant: 'p',
  color: 'default',
  children: String(props.children ?? 'Paragraph text goes here.'),
});

export const TYPOGRAPHY_PARAGRAPH_PRESET: IPreset = {
  name: 'typography-paragraph',
  rootCandidates: [{ type: 'ui.Typography', weight: 1, refineProps: refineParagraph }],
};
