export type { ICheckOptions, IViolation } from './check';
export { check } from './check';
export type { Layer } from './classify';
export { classify, extractGroup } from './classify';
export { formatViolation, formatViolations } from './format';
export { CROSS_LAYER_ALLOWED, LAYER_PREFIXES, RUNTIME_ALLOWED } from './rules';
export type { Zone } from './zones';
export {
  classifyZone,
  extractZonePackage,
  isZoneImportAllowed,
  PACKAGE_TO_ZONE,
  ZONE_ALLOWED_DEPS,
} from './zones';
