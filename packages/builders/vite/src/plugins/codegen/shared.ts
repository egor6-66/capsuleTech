/**
 * Re-exports of pure (stateless) code-generation functions from capsuleRegistry.ts.
 *
 * These are available here for convenience when building custom SubGenerators:
 * import { generateBarrelRegistry, ... } from '@capsuletech/vite-builder/codegen/shared'
 *
 * All originals live in plugins/capsuleRegistry.ts (backward-compat public exports).
 */

export {
  type BarrelFiles,
  type BootstrapContribution,
  type EndpointLeaf,
  endpointFileToLeaf,
  // --- AppConfig ---
  generateAppConfigRuntime,
  // --- Barrel registry ---
  generateBarrelRegistry,
  // --- Bootstrap ---
  generateBootstrap,
  // --- Bootstrap ---
  generateBootstrap,
  // --- Endpoints ---
  generateEndpointsRuntime,
  generateEndpointsTypes,
  // --- Layer types ---
  generateLayerTypes,
  // --- Packages ---
  generatePackagesRuntime,
  generatePackagesTypes,
  generateRegistryIndex,
  generateRegistryPackageJson,
  type PackageEntry,
  parseManifestSource,
  type ResolvedPackageEntry,
  renderAppTagsTypes,
  resolvePackageEntries,
  // --- Leaf helpers ---
  wrapperFileToLeaf,
} from '../capsuleRegistry';
