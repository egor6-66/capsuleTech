/**
 * Studio palette templates — composition of `@capsuletech/data-gen` presets
 * with studio-specific UI metadata (label, forType, group, previewSeed).
 *
 * data-gen engine + presets + RNG itself live in `@capsuletech/data-gen`.
 * This barrel keeps internal studio imports stable (`from '../../generators'`).
 */
export {
  buildTemplate,
  getAllTemplates,
  type ITemplate,
  listTemplatesFor,
} from './templates';
