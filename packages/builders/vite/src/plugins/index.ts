export { default as solidPlugin } from 'vite-plugin-solid';
export { AliasesPlugin } from './aliases';
export type { PackageEntry, ResolvedPackageEntry } from './capsuleRegistry';
// Unified codegen orchestrator — replaces ExportGeneratorPlugin,
// EndpointsRegistryPlugin, and AppConfigPlugin (codegen part).
// Re-export sub-generators for tests and external tooling.
export {
  CapsuleRegistryPlugin,
  generateAppConfigRuntime,
  generateBootstrap,
  generateEndpointsRuntime,
  generateEndpointsTypes,
  generatePackagesRuntime,
  generatePackagesTypes,
  generateWrappersRuntime,
  generateWrappersTypes,
  LAYER_INIT_ORDER,
  parseManifestSource,
  resolvePackageEntries,
} from './capsuleRegistry';
export { CompliancePlugin } from './compliance';
export { HMRWrappingPlugin } from './HMRWrapping';
export { RouterPlugin } from './router';
export { EnsureScaffoldPlugin } from './scaffold';
export { staticCopyPlugin } from './staticCopy';
