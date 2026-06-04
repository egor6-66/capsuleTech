import type { IPreset, IPropsRefiner } from '../types';

/**
 * BUTTON_PRIMARY_PRESET — «Primary button». Одна нода ui.Button с variant:default.
 * Для не-контейнерных примитивов темплейт = одна нода с заданными пропсами.
 */
const refinePrimary: IPropsRefiner = (props) => ({
  ...props,
  variant: 'default',
  children: String(props.children ?? 'Submit'),
});

export const BUTTON_PRIMARY_PRESET: IPreset = {
  name: 'button-primary',
  rootCandidates: [{ type: 'ui.Button', weight: 1, refineProps: refinePrimary }],
};

/**
 * BUTTON_OUTLINE_PRESET — «Outline button». Одна нода ui.Button с variant:outline.
 */
const refineOutline: IPropsRefiner = (props) => ({
  ...props,
  variant: 'outline',
  children: String(props.children ?? 'Cancel'),
});

export const BUTTON_OUTLINE_PRESET: IPreset = {
  name: 'button-outline',
  rootCandidates: [{ type: 'ui.Button', weight: 1, refineProps: refineOutline }],
};
