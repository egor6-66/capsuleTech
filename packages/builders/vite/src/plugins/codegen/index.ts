/**
 * Public API for the codegen sub-system.
 *
 * - createCapsuleRegistryPlugin: the unified Vite plugin (orchestrator)
 * - SubGenerator / CodegenContext: contracts for custom generators
 * - createXxxSubGenerator: factory functions for built-in generators
 *   (exported for testing and for consumers that want to compose generators)
 */

export { createAppConfigSubGenerator } from './generators/appConfig';
// Built-in generator factories (exported for extension points).
export { createBarrelRegistrySubGenerator } from './generators/barrelRegistry';
export { createBootstrapSubGenerator } from './generators/bootstrap';
export {
  checkDocsJsonExport,
  createDocsSourcesSubGenerator,
  derivePackageShort,
  generateDocsSourcesRuntime,
} from './generators/docs-sources';
export { createEndpointsSubGenerator, createEndpointsSubGenerator } from './generators/endpoints';
export { createPackagesSubGenerator, createPackagesSubGenerator } from './generators/packages';
export type {
  AppConfigResult,
  AppConfigShape,
  AppConfigShape,
  CodegenContext,
  CodegenContext,
  SubGenerator,
  SubGenerator,
} from './interfaces';
export {
  createCapsuleRegistryPlugin,
  createCapsuleRegistryPlugin,
  type IOrchestratorProps,
  type IOrchestratorProps,
  LAYER_INIT_ORDER,
  LAYER_INIT_ORDER,
} from './orchestrator';
