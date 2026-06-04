/**
 * CapsuleRegistryPlugin — unified codegen orchestrator.
 *
 * Replaces: ExportGeneratorPlugin + EndpointsRegistryPlugin + AppConfigPlugin (codegen part).
 * Retains AppConfigPlugin only for its `transform` hook (defineAppConfig identity-unwrap).
 *
 * Design:
 *  - LAYER_INIT_ORDER is the single source of truth for what gets generated and
 *    in what order those modules appear in bootstrap.tsx.
 *  - Sub-generators are stateless functions: `(leaves, ctx) => string`.
 *    Adding a new layer = add entry to LAYER_INIT_ORDER + write sub-generator.
 *  - Single watcher on apps/<app>/src/** dispatches to sub-generators by path.
 *  - bootstrap.tsx is generated deterministically by the plugin on every change
 *    (no longer a static scaffold template that is copied once).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { names } from '@nx/devkit';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { createJiti } from 'jiti';
import type { Plugin, ViteDevServer } from 'vite';
import { walkFiles, watcherManager } from '../utils';
import { DEFINE_FACTORIES, EAGER_IMPORT_LAYERS, LAYER_TO_NAMESPACE } from './constants';

// CJS/ESM interop for @babel/traverse (same pattern as hmrWrapping.ts)
const traverse = (
  typeof _traverse === 'function' ? _traverse : (_traverse as { default?: typeof _traverse }).default
) as typeof _traverse;

// ---------------------------------------------------------------------------
// Package entry types
// ---------------------------------------------------------------------------

/** Normalized form of a packages[] entry after parsing AppConfigShape. */
export interface PackageEntry {
  /** npm package name, e.g. '@capsuletech/web-map' */
  pkg: string;
  /** Global name override from { use, as }, if provided */
  as?: string;
}

/** Resolved package entry: globalName is confirmed at build-time. */
export interface ResolvedPackageEntry {
  pkg: string;
  globalName: string;
  /**
   * Controller keys from manifest.controllers, if present.
   * e.g. `{ Editor: EditorController }` → `['Editor']`
   * These are merged into the global `Controllers` namespace (not under globalName).
   */
  controllerKeys?: string[];
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const writeOut = (path: string, content: string) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf-8');
};

// ---------------------------------------------------------------------------
// Leaf types
// ---------------------------------------------------------------------------

/** Represents a source file belonging to a HCA layer (Widget, Entity, etc.). */
interface WrapperLeaf {
  layer: string;
  /** e.g. `@widgets/forms/auth` */
  importPath: string;
  /** PascalCase segments after layer dir, e.g. ['Forms', 'Auth'] */
  segments: string[];
}

/** Represents a source file belonging to endpoints/. */
interface EndpointLeaf {
  /** Lower-case segments: e.g. ['admin', 'users'] */
  segments: string[];
  /** Relative path from endpoints/ without extension: e.g. 'admin/users' */
  relPath: string;
}

// ---------------------------------------------------------------------------
// Tree builder (shared by wrappers and endpoints)
// ---------------------------------------------------------------------------

interface TreeNode<L> {
  children: Map<string, TreeNode<L>>;
  leaf?: L;
}

const buildTree = <L extends { segments: string[] }>(leaves: L[]): TreeNode<L> => {
  const root: TreeNode<L> = { children: new Map() };
  for (const leaf of leaves) {
    let node = root;
    for (const seg of leaf.segments) {
      let child = node.children.get(seg);
      if (!child) {
        child = { children: new Map() };
        node.children.set(seg, child);
      }
      node = child;
    }
    node.leaf = leaf;
  }
  return root;
};

// ---------------------------------------------------------------------------
// LAYER_INIT_ORDER — single source of truth for bootstrap import ordering
//
// Phase 'globals':   populdate globalThis synchronously (wrappers.ts).
//                    MUST come before anything that uses Widgets/Entities etc.
// Phase 'subsystems': depend on globals (endpoints, app-config).
// Phase 'render':     TanStack Router routeTree — evaluated last.
// ---------------------------------------------------------------------------

type LayerPhase = 'globals' | 'subsystems' | 'render';

interface LayerEntry {
  name: string;
  phase: LayerPhase;
  /** Relative import path from bootstrap.tsx (inside .capsule/) */
  importPath: string;
}

export const LAYER_INIT_ORDER: readonly LayerEntry[] = [
  // Phase 1 — populate globals (Object.assign(globalThis, ...)) on module eval
  {
    name: 'wrappers',
    phase: 'globals',
    importPath: './registry/wrappers',
  },
  // Phase 1b — optional package globals (Maps, Render, etc.) — same phase, after wrappers
  {
    name: 'packages',
    phase: 'globals',
    importPath: './registry/packages',
  },
  // Phase 2 — subsystems that depend on globals
  {
    name: 'app-config',
    phase: 'subsystems',
    importPath: './app-config.gen',
  },
  // Phase 3 — entry point / render tree (TanStack Router generates routeTree externally)
  {
    name: 'routes',
    phase: 'render',
    importPath: './routes/routeTree.gen',
  },
] as const;

// ---------------------------------------------------------------------------
// Sub-generator: wrappers.ts (Phase: globals)
// ---------------------------------------------------------------------------

const segmentToPascal = (seg: string, isLast: boolean): string => {
  const cleaned = isLast ? seg.replace(/\.[^/.]+$/, '') : seg;
  return names(cleaned).className;
};

const wrapperFileToLeaf = (
  file: string,
  watchRoot: string,
  layers: readonly string[],
): WrapperLeaf | null => {
  const rel = relative(watchRoot, file).split(/[\\/]/).filter(Boolean);
  const [layerDir, ...rest] = rel;
  if (!layers.includes(layerDir)) return null;
  if (rest.length === 0) return null;
  if (rest.some((seg) => seg.startsWith('.'))) return null;
  const importPath = `@${layerDir}/${rest.join('/')}`.replace(/\.[^/.]+$/, '');
  const segments = rest.map((seg, i) => segmentToPascal(seg, i === rest.length - 1));
  return { layer: layerDir, importPath, segments };
};

const renderWrapperRuntimeNode = (
  node: TreeNode<WrapperLeaf>,
  indent: string,
  eager: boolean,
): string => {
  if (node.leaf && node.children.size === 0) {
    const { importPath, segments } = node.leaf;
    if (eager) return `_${segments.join('_')}`;
    return `lazy(() => import('${importPath}')) as unknown as typeof import('${importPath}').default`;
  }
  const childIndent = `${indent}  `;
  const keys = [...node.children.keys()].sort();
  const entries = keys
    .map(
      (key) =>
        `${childIndent}${key}: ${renderWrapperRuntimeNode(node.children.get(key)!, childIndent, eager)}`,
    )
    .join(',\n');
  return `{\n${entries}\n${indent}}`;
};

const renderWrapperTypeNode = (node: TreeNode<WrapperLeaf>, indent: string): string => {
  if (node.leaf && node.children.size === 0) {
    return `typeof import('${node.leaf.importPath}').default`;
  }
  const childIndent = `${indent}  `;
  const keys = [...node.children.keys()].sort();
  const props = keys
    .map(
      (key) =>
        `${childIndent}${key}: ${renderWrapperTypeNode(node.children.get(key)!, childIndent)};`,
    )
    .join('\n');
  return `{\n${props}\n${indent}}`;
};

/**
 * Generates .capsule/registry/wrappers.ts.
 * Stateless: (wrapperLeaves) => string.
 */
export const generateWrappersRuntime = (leaves: WrapperLeaf[]): string => {
  const header: string[] = [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    "import { lazy } from 'solid-js';",
    '',
  ];

  const eagerImports: string[] = [];
  const body: string[] = [];

  const byLayer: Record<string, WrapperLeaf[]> = {};
  for (const leaf of leaves) {
    if (!byLayer[leaf.layer]) byLayer[leaf.layer] = [];
    byLayer[leaf.layer].push(leaf);
  }

  const layerOrder = Object.keys(LAYER_TO_NAMESPACE);
  const namespaces: string[] = [];

  for (const layer of layerOrder) {
    const namespace =
      LAYER_TO_NAMESPACE[layer as keyof typeof LAYER_TO_NAMESPACE] ?? names(layer).className;
    namespaces.push(namespace);
    const layerLeaves = byLayer[layer] ?? [];
    const isEager = EAGER_IMPORT_LAYERS.has(layer);

    if (layerLeaves.length === 0) {
      body.push(`export const ${namespace} = {};`);
      body.push('');
      continue;
    }

    if (isEager) {
      for (const leaf of layerLeaves) {
        const varName = `_${leaf.segments.join('_')}`;
        eagerImports.push(`import ${varName} from '${leaf.importPath}';`);
      }
    }

    const tree = buildTree(layerLeaves);
    const childIndent = '  ';
    const keys = [...tree.children.keys()].sort();
    const entries = keys
      .map(
        (key) =>
          `${childIndent}${key}: ${renderWrapperRuntimeNode(tree.children.get(key)!, childIndent, isEager)}`,
      )
      .join(',\n');
    body.push(`export const ${namespace} = {\n${entries}\n};`);
    body.push('');
  }

  // Top-level side-effect: populate globalThis synchronously on module eval.
  // bootstrap.tsx imports this as a bare side-effect import so the assignment
  // fires before routeTree (→ pages → widgets → features → endpoints) evaluates.
  const namespaceList = namespaces.join(', ');
  body.push(`Object.assign(globalThis, { ${namespaceList} });`);
  body.push('');

  const parts = [...header];
  if (eagerImports.length > 0) parts.push(...eagerImports, '');
  parts.push(...body);
  return parts.join('\n');
};

/**
 * Generates .capsule/@types/slots.d.ts.
 * Stateless: (wrapperLeaves) => string.
 */
export const generateWrappersTypes = (leaves: WrapperLeaf[]): string => {
  const lines: string[] = [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    'declare global {',
  ];

  const byLayer: Record<string, WrapperLeaf[]> = {};
  for (const leaf of leaves) {
    if (!byLayer[leaf.layer]) byLayer[leaf.layer] = [];
    byLayer[leaf.layer].push(leaf);
  }

  const layerOrder = Object.keys(LAYER_TO_NAMESPACE);
  for (const layer of layerOrder) {
    const namespace =
      LAYER_TO_NAMESPACE[layer as keyof typeof LAYER_TO_NAMESPACE] ?? names(layer).className;
    const layerLeaves = byLayer[layer] ?? [];
    if (layerLeaves.length === 0) {
      lines.push(`  interface ${namespace} {}`);
      lines.push(`  const ${namespace}: ${namespace};`);
      continue;
    }
    const tree = buildTree(layerLeaves);
    const childIndent = '    ';
    const keys = [...tree.children.keys()].sort();
    const props = keys
      .map(
        (key) =>
          `${childIndent}${key}: ${renderWrapperTypeNode(tree.children.get(key)!, childIndent)};`,
      )
      .join('\n');
    lines.push(`  interface ${namespace} {`);
    lines.push(props);
    lines.push('  }');
    lines.push(`  const ${namespace}: ${namespace};`);
  }

  lines.push('}');
  lines.push('export {};');
  lines.push('');
  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Sub-generator: packages.ts + packages.d.ts (Phase: globals)
// ---------------------------------------------------------------------------

/**
 * Normalizes a raw packages[] entry to PackageEntry.
 * Accepts `string` or `{ use: string; as?: string }`.
 */
const normalizePackageEntry = (raw: string | { use: string; as?: string }): PackageEntry => {
  if (typeof raw === 'string') return { pkg: raw };
  return { pkg: raw.use, as: raw.as };
};

/** Internal result of resolving a package manifest. */
interface ResolvedManifestInfo {
  name: string;
  /** Keys from manifest.controllers (empty array if absent). */
  controllerKeys: string[];
}

/**
 * Pure AST parse of a manifest source string.
 *
 * Exported for testing — no I/O, no module execution.
 *
 * Finds the first ObjectExpression that contains a `name: "<string>"` property
 * and optionally a `controllers: { ... }` ObjectExpression.
 * Structural matching — works even if `defineCapsuleModule` was renamed by the bundler.
 *
 * Returns { name, controllerKeys } or null if no matching ObjectExpression found.
 */
export const parseManifestSource = (
  source: string,
  fileName: string,
): { name: string; controllerKeys: string[] } | null => {
  const isTs = /\.[mc]?ts$/.test(fileName);
  const ast = parse(source, {
    sourceType: 'module',
    plugins: isTs ? ['typescript'] : [],
  });

  let foundName: string | null = null;
  let foundControllerKeys: string[] = [];

  traverse(ast, {
    ObjectExpression(path) {
      // Already found — skip nested objects
      if (foundName !== null) return;

      let localName: string | null = null;
      let localControllerKeys: string[] | null = null;

      for (const prop of path.node.properties) {
        // Only ObjectProperty (not SpreadElement / RestElement)
        if (prop.type !== 'ObjectProperty') continue;

        // Key can be Identifier or StringLiteral
        const keyName =
          prop.key.type === 'Identifier'
            ? prop.key.name
            : prop.key.type === 'StringLiteral'
              ? prop.key.value
              : null;

        if (keyName === 'name') {
          if (prop.value.type === 'StringLiteral') {
            localName = prop.value.value;
          }
        } else if (keyName === 'controllers') {
          if (prop.value.type === 'ObjectExpression') {
            localControllerKeys = [];
            for (const ctrlProp of prop.value.properties) {
              if (ctrlProp.type !== 'ObjectProperty') continue;
              const ctrlKey =
                ctrlProp.key.type === 'Identifier'
                  ? ctrlProp.key.name
                  : ctrlProp.key.type === 'StringLiteral'
                    ? ctrlProp.key.value
                    : null;
              if (ctrlKey !== null) localControllerKeys.push(ctrlKey);
            }
          }
        }
      }

      // Accept this ObjectExpression only if it has a `name` StringLiteral
      if (localName !== null) {
        foundName = localName;
        foundControllerKeys = localControllerKeys ?? [];
        path.stop();
      }
    },
  });

  if (foundName === null) return null;
  return { name: foundName, controllerKeys: foundControllerKeys };
};

/**
 * Resolves the manifest info for a package entry via static AST analysis of
 * its compiled /capsule subpath — no module execution required.
 *
 * I/O part: resolves the file path via require.resolve(), reads source with readFileSync,
 * then delegates pure parsing to parseManifestSource().
 *
 * Returns null on any error (warn+skip, never fatal).
 */
const resolveManifestInfo = (
  entry: PackageEntry,
  appConfigDir: string,
): ResolvedManifestInfo | null => {
  const subpath = `${entry.pkg}/capsule`;

  // Step 1: resolve physical file path (no execution)
  let manifestFile: string;
  try {
    const req = createRequire(resolve(appConfigDir, 'capsule.app.ts'));
    manifestFile = req.resolve(subpath);
  } catch {
    console.warn(
      `[capsule-registry] could not resolve '${subpath}' — package not installed or missing /capsule subpath. Skipping.`,
    );
    return null;
  }

  // Step 2: read source
  let source: string;
  try {
    source = readFileSync(manifestFile, 'utf-8');
  } catch {
    console.warn(
      `[capsule-registry] could not read manifest file '${manifestFile}'. Skipping.`,
    );
    return null;
  }

  // Step 3: parse via pure AST function
  let parsed: { name: string; controllerKeys: string[] } | null;
  try {
    parsed = parseManifestSource(source, manifestFile);
  } catch (e) {
    console.warn(
      `[capsule-registry] failed to parse manifest '${manifestFile}': ${String(e)}. Skipping.`,
    );
    return null;
  }

  // Step 4: validate result
  const resolvedName = entry.as ?? parsed?.name ?? null;
  if (!resolvedName) {
    console.warn(
      `[capsule-registry] manifest '${manifestFile}' parsed but no 'name' StringLiteral found — skipping`,
    );
    return null;
  }

  return { name: resolvedName, controllerKeys: parsed?.controllerKeys ?? [] };
};

/**
 * Resolves all package entries to ResolvedPackageEntry[].
 * Entries that fail manifest resolution are dropped (warn + skip).
 */
export const resolvePackageEntries = (
  raw: ReadonlyArray<string | { use: string; as?: string }> | undefined,
  appConfigDir: string,
): ResolvedPackageEntry[] => {
  if (!raw || raw.length === 0) return [];
  const result: ResolvedPackageEntry[] = [];
  for (const item of raw) {
    const entry = normalizePackageEntry(item);
    const info = resolveManifestInfo(entry, appConfigDir);
    if (info) {
      result.push({
        pkg: entry.pkg,
        globalName: info.name,
        controllerKeys: info.controllerKeys.length > 0 ? info.controllerKeys : undefined,
      });
    }
  }
  return result;
};

/**
 * Generates .capsule/registry/packages.ts.
 * Stateless: (entries) => string.
 *
 * Empty list → valid empty module with bare Object.assign.
 *
 * For packages with `controllerKeys` the generated code augments the global
 * `Controllers` namespace (populated earlier by wrappers.ts) rather than
 * overwriting it.  Each key is assigned individually so that app-level
 * controllers are never shadowed:
 *
 *   (globalThis.Controllers ??= {}).Editor = Maps_mod.controllers.Editor;
 *
 * The packages entry in LAYER_INIT_ORDER has phase 'globals' and is ordered
 * AFTER 'wrappers', so by the time this module evaluates, globalThis.Controllers
 * already holds the app-codegen exports from wrappers.ts.
 */
export const generatePackagesRuntime = (entries: ResolvedPackageEntry[]): string => {
  const lines: string[] = ['// generated by CapsuleRegistryPlugin — не редактировать руками'];
  if (entries.length === 0) {
    lines.push('Object.assign(globalThis, {});');
    lines.push('');
    return lines.join('\n');
  }
  lines.push('');
  for (const { pkg, globalName } of entries) {
    lines.push(`import ${globalName}_mod from '${pkg}/capsule';`);
  }
  lines.push('');
  for (const { globalName } of entries) {
    lines.push(`export const ${globalName} = ${globalName}_mod.components;`);
  }
  lines.push('');

  // Merge controller keys into the global Controllers namespace.
  // Must be done BEFORE Object.assign so that the augmentation is visible
  // synchronously on module eval.
  const controllersEntries = entries.filter((e) => e.controllerKeys && e.controllerKeys.length > 0);
  if (controllersEntries.length > 0) {
    for (const { globalName, controllerKeys } of controllersEntries) {
      for (const key of controllerKeys!) {
        lines.push(
          `(globalThis.Controllers ??= {})[${JSON.stringify(key)}] = ${globalName}_mod.controllers[${JSON.stringify(key)}];`,
        );
      }
    }
    lines.push('');
  }

  const names = entries.map((e) => e.globalName).join(', ');
  lines.push(`Object.assign(globalThis, { ${names} });`);
  lines.push('');
  return lines.join('\n');
};

/**
 * Generates .capsule/@types/packages.d.ts.
 * Stateless: (entries) => string.
 *
 * Empty list → minimal module augmentation file.
 *
 * For packages with `controllerKeys` the generated types augment the global
 * `Controllers` interface (declared by slots.d.ts from wrappers codegen) using
 * the same module-augmentation pattern as app-level controllers:
 *
 *   interface Controllers {
 *     Editor: typeof import('@capsuletech/web-dnd/capsule')['default']['controllers']['Editor'];
 *   }
 *
 * This must appear in the SAME `declare global` block (global augmentation)
 * so TS merges it with the existing `interface Controllers` from slots.d.ts.
 */
export const generatePackagesTypes = (entries: ResolvedPackageEntry[]): string => {
  if (entries.length === 0) {
    return [
      '// generated by CapsuleRegistryPlugin — не редактировать руками',
      'export {};',
      '',
    ].join('\n');
  }
  const lines: string[] = [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    'declare global {',
  ];

  // Component namespace const declarations.
  for (const { pkg, globalName } of entries) {
    lines.push(
      `  const ${globalName}: typeof import('${pkg}/capsule')['default']['components'];`,
    );
  }

  // Controllers interface augmentation for packages that expose controllers.
  const controllersEntries = entries.filter((e) => e.controllerKeys && e.controllerKeys.length > 0);
  if (controllersEntries.length > 0) {
    lines.push('  interface Controllers {');
    for (const { pkg, controllerKeys } of controllersEntries) {
      for (const key of controllerKeys!) {
        lines.push(
          `    ${key}: typeof import('${pkg}/capsule')['default']['controllers'][${JSON.stringify(key)}];`,
        );
      }
    }
    lines.push('  }');
  }

  lines.push('}');
  lines.push('export {};');
  lines.push('');
  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Sub-generator: endpoints.ts (Phase: subsystems)
// ---------------------------------------------------------------------------

const ENDPOINTS_DIR = 'endpoints';

const endpointFileToLeaf = (file: string, watchRoot: string): EndpointLeaf | null => {
  const rel = relative(watchRoot, file).split(/[\\/]/).filter(Boolean);
  if (rel[0] !== ENDPOINTS_DIR) return null;
  const inner = rel.slice(1);
  if (inner.length === 0) return null;
  if (inner.some((seg) => seg.startsWith('.'))) return null;
  const last = inner[inner.length - 1].replace(/\.[^/.]+$/, '');
  const segments = last === 'index' ? inner.slice(0, -1) : [...inner.slice(0, -1), last];
  if (segments.length === 0) return null;
  const relPath = inner.join('/').replace(/\.[^/.]+$/, '');
  return { segments, relPath };
};

const aliasFromSegments = (segments: string[]): string => segments.join('__');

const renderEndpointRuntimeNode = (node: TreeNode<EndpointLeaf>, indent: string): string => {
  if (node.leaf && node.children.size === 0) {
    return aliasFromSegments(node.leaf.segments);
  }
  const childIndent = `${indent}  `;
  const keys = [...node.children.keys()].sort();
  const entries = keys
    .map(
      (key) =>
        `${childIndent}${key}: ${renderEndpointRuntimeNode(node.children.get(key)!, childIndent)}`,
    )
    .join(',\n');
  return `{\n${entries}\n${indent}}`;
};

/**
 * Generates .capsule/registry/endpoints.ts.
 * Stateless: (endpointLeaves, srcRelFromRegistry) => string.
 */
export const generateEndpointsRuntime = (
  leaves: EndpointLeaf[],
  srcRelFromRegistry: string,
): string => {
  const lines: string[] = ['// generated by CapsuleRegistryPlugin — не редактировать руками'];
  if (leaves.length === 0) {
    lines.push('export const endpoints = {} as const;');
    lines.push('export type Endpoints = typeof endpoints;');
    lines.push('');
    return lines.join('\n');
  }

  for (const leaf of leaves) {
    const alias = aliasFromSegments(leaf.segments);
    lines.push(
      `import * as ${alias} from '${srcRelFromRegistry}/${ENDPOINTS_DIR}/${leaf.relPath}';`,
    );
  }
  lines.push('');

  const tree = buildTree(leaves);
  const childIndent = '  ';
  const keys = [...tree.children.keys()].sort();
  const entries = keys
    .map(
      (key) =>
        `${childIndent}${key}: ${renderEndpointRuntimeNode(tree.children.get(key)!, childIndent)}`,
    )
    .join(',\n');
  lines.push(`export const endpoints = {\n${entries}\n} as const;`);
  lines.push('export type Endpoints = typeof endpoints;');
  lines.push('');
  return lines.join('\n');
};

/**
 * Generates .capsule/@types/api.d.ts.
 * Stateless: () => string.
 */
export const generateEndpointsTypes = (): string =>
  [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    "import type { InferApi } from '@capsuletech/web-query';",
    "import type { Endpoints } from '../registry/endpoints';",
    '',
    'declare global {',
    '  /**',
    '   * Typed-proxy returned by `createApi(...)` injected in Feature as `services.api`.',
    '   */',
    '  interface CapsuleApi extends InferApi<Endpoints> {}',
    '}',
    'export {};',
    '',
  ].join('\n');

// ---------------------------------------------------------------------------
// Sub-generator: app-config.gen.ts (Phase: subsystems)
// ---------------------------------------------------------------------------

const loadConfigFresh = (configPath: string): unknown => {
  const j = createJiti(import.meta.url, { interopDefault: true, moduleCache: false });
  const mod = j(configPath) as { default?: unknown } | unknown;
  return (mod as { default?: unknown })?.default ?? mod;
};

interface AppConfigShape {
  meta?: { tags?: readonly string[] };
  aliases?: Record<string, readonly string[]>;
  packages?: ReadonlyArray<string | { use: string; as?: string }>;
}

const renderAppTagsTypes = (tags: readonly string[], aliasKeys: readonly string[]): string => {
  if (tags.length === 0 && aliasKeys.length === 0) {
    return '// generated by CapsuleRegistryPlugin — пустой capsule.app.ts\nexport {};\n';
  }
  const renderInterface = (name: string, keys: readonly string[]): string => {
    if (keys.length === 0) return `  interface ${name} {}\n`;
    const entries = keys.map((k) => `    ${JSON.stringify(k)}: true;`).join('\n');
    return `  interface ${name} {\n${entries}\n  }\n`;
  };
  return [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    'declare global {',
    renderInterface('CapsuleTags', tags),
    renderInterface('CapsuleAliases', aliasKeys),
    '}',
    'export {};',
    '',
  ].join('\n');
};

/**
 * Generates .capsule/app-config.gen.ts.
 * Stateless: (aliases) => string.
 *
 * Import order inside this file:
 *  1. registerAliases — side-effect, uses aliases JSON only
 *  2. import appConfigRaw — reactive capsule.app browser eval
 *  3. import endpoints — from registry (already in globalThis after wrappers)
 *  4. setApiClient — conditional, depends on appConfig.api
 */
export const generateAppConfigRuntime = (
  aliases: Record<string, readonly string[]> | undefined,
): string => {
  const aliasesLiteral = JSON.stringify(aliases ?? {}, null, 2);
  return [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    "import { registerAliases } from '@capsuletech/web-state';",
    "import { createApi, setApiClient } from '@capsuletech/web-query';",
    "import { type IAppConfig } from '@capsuletech/web-core/app-config';",
    "import appConfigRaw from '../capsule.app';",
    "import { endpoints } from './registry/endpoints';",
    '',
    'const appConfig = appConfigRaw as IAppConfig;',
    '',
    `registerAliases(${aliasesLiteral});`,
    '',
    'if (appConfig.api) {',
    '  setApiClient(createApi(appConfig.api, endpoints));',
    '}',
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// Sub-generator: bootstrap.tsx (generated, not static template)
//
// Import order is derived strictly from LAYER_INIT_ORDER phases:
//   Phase globals   → bare side-effect imports (no named binding)
//   Phase subsystems → bare side-effect imports
//   Phase render    → named import `{ routeTree }`
//
// This makes it impossible to accidentally reorder the layers: the only place
// to change ordering is LAYER_INIT_ORDER above.
// ---------------------------------------------------------------------------

/**
 * Generates .capsule/bootstrap.tsx.
 * Stateless: () => string.
 *
 * The generated file is deterministic: no user edits needed / expected.
 * `.capsule/` is gitignored, so regeneration on every plugin run is safe.
 */
export const generateBootstrap = (): string => {
  const lines: string[] = [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    "import './styles.css';",
    "import { BaseProviders } from '@capsuletech/web-core/providers';",
    "import { type IAppConfig } from '@capsuletech/web-core/app-config';",
    "import appConfigRaw from '../capsule.app';",
  ];

  for (const layer of LAYER_INIT_ORDER) {
    if (layer.name === 'routes') {
      // Routes is a named import — routeTree is consumed by BaseProviders.
      lines.push(`import { routeTree } from '${layer.importPath}';`);
    } else {
      // All other layers: bare side-effect import.
      // wrappers: runs Object.assign(globalThis, ...) on module eval.
      // app-config: runs registerAliases + setApiClient on module eval.
      lines.push(`import '${layer.importPath}';`);
    }
  }

  lines.push('');
  lines.push('const appConfig = appConfigRaw as IAppConfig;');
  lines.push('');
  lines.push('export const Bootstrap = () => {');
  lines.push('  return (');
  lines.push('    <BaseProviders');
  lines.push('      routeTree={routeTree}');
  lines.push('      basepath={import.meta.env.BASE_URL}');
  lines.push('      notFoundRedirect={appConfig.router?.notFoundRedirect}');
  lines.push('      beforeLoad={appConfig.router?.beforeLoad}');
  lines.push('    />');
  lines.push('  );');
  lines.push('};');
  lines.push('');

  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Plugin props
// ---------------------------------------------------------------------------

interface IProps {
  /** Absolute path to .capsule/ directory */
  capsuleRoot: string;
  /** Absolute path to apps/<app>/src/ */
  watchDir: string;
  /** Absolute path to apps/<app>/capsule.app.ts */
  appConfigPath: string;
  /**
   * Optional callback: called after appConfig is loaded.
   * Consumers (e.g. CompliancePlugin) can read aliasKeys from it.
   */
  onAppConfigLoad?: (config: AppConfigShape) => void;
}

// ---------------------------------------------------------------------------
// Endpoint factory injection (enforce:'pre' transform)
//
// Mirrors EndpointsRegistryPlugin's transform: injects `defineEndpoint` import
// into every file under src/endpoints/ that doesn't already have it.
// ---------------------------------------------------------------------------

const ENDPOINT_FACTORY = (() => {
  const pkg = '@capsuletech/web-query';
  const factoryNames = DEFINE_FACTORIES[pkg as keyof typeof DEFINE_FACTORIES];
  const name = factoryNames?.find((n) => n === 'defineEndpoint');
  if (!name) throw new Error('[capsule-registry] defineEndpoint missing from DEFINE_FACTORIES');
  return {
    importLine: `import { ${name} } from '${pkg}';`,
    alreadyImportedRe: new RegExp(`\\bimport\\b[^;]*\\b${name}\\b`),
  };
})();

// ---------------------------------------------------------------------------
// Main plugin export
// ---------------------------------------------------------------------------

/**
 * CapsuleRegistryPlugin — owns ALL codegen in .capsule/:
 *
 *  - .capsule/registry/wrappers.ts      (ExportGeneratorPlugin replacement)
 *  - .capsule/@types/slots.d.ts         (ExportGeneratorPlugin replacement)
 *  - .capsule/registry/endpoints.ts     (EndpointsRegistryPlugin replacement)
 *  - .capsule/@types/api.d.ts           (EndpointsRegistryPlugin replacement)
 *  - .capsule/app-config.gen.ts         (AppConfigPlugin codegen replacement)
 *  - .capsule/@types/app-tags.d.ts      (AppConfigPlugin codegen replacement)
 *  - .capsule/bootstrap.tsx             (NEW: generated, not static scaffold)
 *
 * Also provides enforce:'pre' transform for defineEndpoint injection (replaces
 * EndpointsRegistryPlugin's transform).
 *
 * Does NOT replace AppConfigPlugin.transform (defineAppConfig identity-unwrap) —
 * that lives in the thin AppConfigPlugin and must stay as a separate plugin
 * since it intercepts capsule.app.ts file transforms.
 */
export const CapsuleRegistryPlugin = ({
  capsuleRoot,
  watchDir,
  appConfigPath,
  onAppConfigLoad,
}: IProps): Plugin => {
  // --- Wrapper state ---
  const wrapperLayers = [...Object.keys(LAYER_TO_NAMESPACE)] as const;
  const knownWrappers = new Map<string, WrapperLeaf>();

  // --- Endpoint state ---
  const knownEndpoints = new Map<string, EndpointLeaf>();
  const absEndpointsDir = resolve(watchDir, ENDPOINTS_DIR);

  // Relative path from .capsule/registry/ to src/ (for endpoint imports).
  const srcRelFromRegistry = (() => {
    const out = resolve(capsuleRoot, 'registry', 'endpoints.ts');
    return relative(dirname(out), watchDir).split(/[\\/]/).join('/') || '.';
  })();

  // --- Flush flags ---
  let wrappersNeedsFlush = false;
  let endpointsNeedsFlush = false;
  let scanned = false;

  // --- Output paths ---
  const wrappersOut = resolve(capsuleRoot, 'registry', 'wrappers.ts');
  const slotsTypesOut = resolve(capsuleRoot, '@types', 'slots.d.ts');
  const endpointsOut = resolve(capsuleRoot, 'registry', 'endpoints.ts');
  const apiTypesOut = resolve(capsuleRoot, '@types', 'api.d.ts');
  const appConfigRuntimeOut = resolve(capsuleRoot, 'app-config.gen.ts');
  const appTagsTypesOut = resolve(capsuleRoot, '@types', 'app-tags.d.ts');
  const packagesOut = resolve(capsuleRoot, 'registry', 'packages.ts');
  const packagesTypesOut = resolve(capsuleRoot, '@types', 'packages.d.ts');
  const bootstrapOut = resolve(capsuleRoot, 'bootstrap.tsx');

  // Directory of capsule.app.ts — used as jiti root for manifest resolution.
  const appConfigDir = dirname(appConfigPath);

  // --- Flush helpers ---
  const flushWrappers = () => {
    if (!wrappersNeedsFlush) return;
    wrappersNeedsFlush = false;
    const leaves = [...knownWrappers.values()].sort((a, b) => {
      if (a.layer !== b.layer) return a.layer.localeCompare(b.layer);
      return a.segments.join('/').localeCompare(b.segments.join('/'));
    });
    writeOut(wrappersOut, generateWrappersRuntime(leaves));
    writeOut(slotsTypesOut, generateWrappersTypes(leaves));
  };

  const flushEndpoints = () => {
    if (!endpointsNeedsFlush) return;
    endpointsNeedsFlush = false;
    const leaves = [...knownEndpoints.values()].sort((a, b) =>
      a.segments.join('/').localeCompare(b.segments.join('/')),
    );
    writeOut(endpointsOut, generateEndpointsRuntime(leaves, srcRelFromRegistry));
    writeOut(apiTypesOut, generateEndpointsTypes());
  };

  const loadAndFlushAppConfig = () => {
    if (!existsSync(appConfigPath)) {
      writeOut(appTagsTypesOut, renderAppTagsTypes([], []));
      writeOut(appConfigRuntimeOut, generateAppConfigRuntime(undefined));
      writeOut(packagesOut, generatePackagesRuntime([]));
      writeOut(packagesTypesOut, generatePackagesTypes([]));
      onAppConfigLoad?.({});
      return;
    }
    let config: AppConfigShape;
    try {
      config = loadConfigFresh(appConfigPath) as AppConfigShape;
    } catch (e) {
      console.error('[capsule-registry] failed to load', appConfigPath, e);
      return;
    }
    const tags = config?.meta?.tags ?? [];
    const aliases = config?.aliases ?? {};
    const aliasKeys = Object.keys(aliases);
    writeOut(appTagsTypesOut, renderAppTagsTypes(tags, aliasKeys));
    writeOut(appConfigRuntimeOut, generateAppConfigRuntime(aliases));

    // Resolve package manifests at build-time (jiti, rooted at appConfigDir).
    // Entries that fail manifest resolution are dropped with a warn — dev-server is not crashed.
    const resolvedPackages = resolvePackageEntries(config?.packages, appConfigDir);
    writeOut(packagesOut, generatePackagesRuntime(resolvedPackages));
    writeOut(packagesTypesOut, generatePackagesTypes(resolvedPackages));

    onAppConfigLoad?.(config);
  };

  const flushBootstrap = () => {
    writeOut(bootstrapOut, generateBootstrap());
  };

  // --- File → wrapper leaf ---
  const handleWrapperEvent = (event: string, file: string) => {
    const leaf = wrapperFileToLeaf(file, watchDir, wrapperLayers);
    if (!leaf) return;
    const key = `${leaf.layer}::${leaf.segments.join('/')}`;
    if (event === 'add' || event === 'addDir') {
      knownWrappers.set(key, leaf);
    } else if (event === 'unlink' || event === 'unlinkDir') {
      knownWrappers.delete(key);
    }
    wrappersNeedsFlush = true;
  };

  // --- File → endpoint leaf ---
  const handleEndpointEvent = (event: string, file: string) => {
    const leaf = endpointFileToLeaf(file, watchDir);
    if (!leaf) return;
    const key = leaf.segments.join('/');
    if (event === 'add' || event === 'addDir') {
      knownEndpoints.set(key, leaf);
    } else if (event === 'unlink' || event === 'unlinkDir') {
      knownEndpoints.delete(key);
    }
    endpointsNeedsFlush = true;
  };

  // --- Initial scan (idempotent) ---
  const initialScan = async (absWatch: string) => {
    if (scanned) return;
    scanned = true;

    for (const file of await walkFiles(absWatch)) {
      handleWrapperEvent('add', file);
      handleEndpointEvent('add', file);
    }

    // Mark both as needing flush even if empty (need valid empty registry files).
    wrappersNeedsFlush = true;
    endpointsNeedsFlush = true;

    flushWrappers();
    flushEndpoints();
    loadAndFlushAppConfig();
    // bootstrap.tsx is (re)generated after all other files are in place.
    flushBootstrap();
  };

  // --- Normalize path for transform comparison (cross-platform + query strips) ---
  const normalizePath = (p: string): string => p.split('?')[0].replace(/\\/g, '/');
  const targetAppConfigPath = normalizePath(appConfigPath);

  return {
    name: 'capsule-registry',
    // enforce:'pre' so the defineEndpoint injection runs before solid-plugin and AutoImport.
    enforce: 'pre',

    // --- defineAppConfig identity-unwrap transform ---
    // Prevents `defineAppConfig` bare identifier from reaching the browser.
    // The FACTORY_REPLACE_RE targets call-sites only (not import statements).
    transform(code, id) {
      const normId = normalizePath(id);

      // 1. defineAppConfig identity-unwrap (for capsule.app.ts only)
      if (normId === targetAppConfigPath) {
        const re = /\bdefineAppConfig(?=\s*\()/g;
        if (re.test(code)) {
          re.lastIndex = 0;
          return {
            code: code.replace(re, '((__x__)=>__x__)'),
            map: null,
          };
        }
      }

      // 2. defineEndpoint injection (for src/endpoints/** files)
      const normEndpointsDir = absEndpointsDir.replace(/\\/g, '/');
      if (normId.startsWith(normEndpointsDir + '/') && /\.[jt]sx?$/.test(normId)) {
        if (ENDPOINT_FACTORY.alreadyImportedRe.test(code)) return null;
        return {
          code: `${ENDPOINT_FACTORY.importLine}\n${code}`,
          map: null,
        };
      }

      return null;
    },

    async buildStart() {
      await initialScan(resolve(watchDir));
    },

    async configureServer(server: ViteDevServer) {
      const absWatch = resolve(server.config.root, watchDir);
      await initialScan(absWatch);

      // Watch capsule.app.ts for changes.
      server.watcher.add(appConfigPath);
      server.watcher.on('change', (file) => {
        if (normalizePath(file) === targetAppConfigPath) {
          loadAndFlushAppConfig();
        }
      });

      // Single watcher for all src/** — dispatches to both sub-generators.
      watcherManager.init(server, absWatch);
      watcherManager.subscribe(absWatch, {
        onStructureChange: (event, paths) => {
          handleWrapperEvent(event, paths.file);
          handleEndpointEvent(event, paths.file);
          flushWrappers();
          flushEndpoints();
        },
      });
    },
  };
};
