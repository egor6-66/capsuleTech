export { generate } from './engine';
export { coin, createRng, pick, pickWeighted, randomInt, seededId, type Rng } from './rng';
export { fuzzProps } from './fuzzer';
export { FORM_PRESET } from './presets/form';
export { CARD_PRODUCT_PRESET } from './presets/card-product';
export { LAYOUT_2COL_PRESET } from './presets/layout-2col';
export { BUTTON_PRIMARY_PRESET, BUTTON_OUTLINE_PRESET } from './presets/button-primary';
export { TYPOGRAPHY_H1_PRESET, TYPOGRAPHY_PARAGRAPH_PRESET } from './presets/typography';
export {
  buildTemplate,
  getAllTemplates,
  listTemplatesFor,
  type ITemplate,
} from './templates';
export type {
  IEditorNode,
  IEditorTree,
  IGenerateOptions,
  IPreset,
  IPropsRefiner,
  ISlotPick,
  ISlotRule,
  NodeId,
} from './types';
