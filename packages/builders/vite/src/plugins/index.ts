export { default as solidPlugin } from 'vite-plugin-solid';
// Re-export from lib-builder so consumers can import from one place.
export { DocsExtractPlugin } from '@capsuletech/lib-builder';
export type { IDocsExtractPluginOptions, IDocsSlugStrategy } from '@capsuletech/lib-builder';
export { AliasesPlugin } from './aliases';
export type { PackageEntry, ResolvedPackageEntry } from './capsuleRegistry';
// Unified codegen orchestrator — replaces ExportGeneratorPlugin,
// EndpointsRegistryPlugin, and AppConfigPlugin (codegen part).
// Re-export sub-generators for tests and external tooling.
export {
  CapsuleRegistryPlugin,
  generateAppConfigRuntime,
  generateBarrelRegistry,
  generateBootstrap,
  generateEndpointsRuntime,
  generateEndpointsTypes,
  generateLayerTypes,
  generatePackagesRuntime,
  generatePackagesTypes,
  generateRegistryIndex,
  generateRegistryPackageJson,
  LAYER_INIT_ORDER,
  parseManifestSource,
  resolvePackageEntries,
} from './capsuleRegistry';
// ADR 037: new orchestrator API (sub-generator architecture).
// createCapsuleRegistryPlugin is the preferred way to compose codegen for new consumers.
export {
  createCapsuleRegistryPlugin,
  createBarrelRegistrySubGenerator,
  createEndpointsSubGenerator,
  createAppConfigSubGenerator,
  createPackagesSubGenerator,
  createBootstrapSubGenerator,
  type SubGenerator,
  type CodegenContext,
  type AppConfigShape,
  type IOrchestratorProps,
} from './codegen';
export { CompliancePlugin } from './compliance';
export { HMRWrappingPlugin } from './HMRWrapping';
export { RouterPlugin } from './router';
export { EnsureScaffoldPlugin } from './scaffold';
export { staticCopyPlugin } from './staticCopy';
