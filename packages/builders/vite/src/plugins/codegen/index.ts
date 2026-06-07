/**
 * Public API for the codegen sub-system.
 *
 * - createCapsuleRegistryPlugin: the unified Vite plugin (orchestrator)
 * - SubGenerator / CodegenContext: contracts for custom generators
 * - createXxxSubGenerator: factory functions for built-in generators
 *   (exported for testing and for consumers that want to compose generators)
 */

export { createCapsuleRegistryPlugin, LAYER_INIT_ORDER, type IOrchestratorProps } from './orchestrator';
export type { SubGenerator, CodegenContext, AppConfigShape } from './interfaces';

// Built-in generator factories (exported for extension points).
export { createBarrelRegistrySubGenerator } from './generators/barrelRegistry';
export { createEndpointsSubGenerator } from './generators/endpoints';
export { createAppConfigSubGenerator } from './generators/appConfig';
export { createPackagesSubGenerator } from './generators/packages';
export { createBootstrapSubGenerator } from './generators/bootstrap';
