/**
 * Re-exports of pure (stateless) code-generation functions from capsuleRegistry.ts.
 *
 * These are available here for convenience when building custom SubGenerators:
 * import { generateBarrelRegistry, ... } from '@capsuletech/vite-builder/codegen/shared'
 *
 * All originals live in plugins/capsuleRegistry.ts (backward-compat public exports).
 */

export {
  // --- Barrel registry ---
  generateBarrelRegistry,
  generateRegistryIndex,
  generateRegistryPackageJson,
  // --- Layer types ---
  generateLayerTypes,
  // --- Endpoints ---
  generateEndpointsRuntime,
  generateEndpointsTypes,
  // --- AppConfig ---
  generateAppConfigRuntime,
  renderAppTagsTypes,
  // --- Packages ---
  generatePackagesRuntime,
  generatePackagesTypes,
  parseManifestSource,
  resolvePackageEntries,
  // --- Bootstrap ---
  generateBootstrap,
  type BootstrapContribution,
  // --- Leaf helpers ---
  wrapperFileToLeaf,
  endpointFileToLeaf,
  type WrapperLeaf,
  type EndpointLeaf,
  type BarrelFiles,
  type PackageEntry,
  type ResolvedPackageEntry,
} from '../capsuleRegistry';
