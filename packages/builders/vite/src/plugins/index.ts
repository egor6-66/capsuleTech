export { default as solidPlugin } from 'vite-plugin-solid';
export { AliasesPlugin } from './aliases';
export { AppSourceServePlugin } from './appSourceServe';
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
  type AppConfigShape,
  type CodegenContext,
  createAppConfigSubGenerator,
  createBarrelRegistrySubGenerator,
  createBootstrapSubGenerator,
  createCapsuleRegistryPlugin,
  createEndpointsSubGenerator,
  createPackagesSubGenerator,
  type IOrchestratorProps,
  type SubGenerator,
} from './codegen';
export { CompliancePlugin } from './compliance';
// ADR 060 Phase 1 — remote-app contract artifact emitter.
export {
  buildContractDts,
  buildManifestJson,
  buildSchemaJson,
  CONTRACT_ARTIFACT_NAMES,
  CONTRACT_URL_PREFIX,
  ContractArtifactPlugin,
  ensureDefineContractImport,
  type IContractArtifactPluginOpts,
  type IContractLike,
  jsonSchemaToTs,
  matchContractRequest,
  produceArtifacts,
} from './contractArtifact';
export type {
  DiagnosticSeverity,
  DiagnosticType,
  IDevDiagnostic,
  IDevDiagnosticsPluginOptions,
  IDevDiagnosticsState,
} from './devDiagnostics';
export { createDevDiagnosticsPlugin } from './devDiagnostics';
export { HMRWrappingPlugin } from './HMRWrapping';
export { RouterPlugin } from './router';
export { EnsureScaffoldPlugin } from './scaffold';
export { staticCopyPlugin } from './staticCopy';
