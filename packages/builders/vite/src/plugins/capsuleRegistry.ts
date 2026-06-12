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
 *
 * ADR-034: module-backed barrel registry.
 *  - Generates .capsule/registry/** barrel-tree (mirror of src/ folder structure).
 *  - Namespaces (Widgets/Views/…) come via auto-import `import { Widgets } from '@capsule/registry'`.
 *  - No Object.assign(globalThis) — bunder sees static import graph → tree-shake by route.
 *  - Alias '@capsule/registry' → .capsule/registry/index.ts registered in configResolved hook.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import { names } from '@nx/devkit';
import { createJiti } from 'jiti';
import type { Plugin, UserConfig, ViteDevServer } from 'vite';
import { walkFiles, watcherManager } from '../utils';
import { DEFINE_FACTORIES, LAYER_TO_NAMESPACE } from './constants';

// CJS/ESM interop for @babel/traverse (same pattern as hmrWrapping.ts)
const traverse = (
  typeof _traverse === 'function'
    ? _traverse
    : (_traverse as { default?: typeof _traverse }).default
) as typeof _traverse;

// ---------------------------------------------------------------------------
// Package entry types
// ---------------------------------------------------------------------------

/** Normalized form of a packages[] entry after parsing AppConfigShape. */
export interface PackageEntry {
  /** npm package name, e.g. '@capsuletech/boost-map' */
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
  /**
   * Component keys from manifest.components, if present.
   * e.g. `{ DataTable: DataTableComp }` → `['DataTable']`
   * Used to generate `namespace <Global> { namespace <Comp> { type Events } }` in packages.d.ts.
   */
  componentKeys?: string[];
  /**
   * Kit Ui-namespace path from manifest.augments (per ADR 046 D5).
   * e.g. `'Ui.Layout'` — codegen emits Object.assign at app boot.
   */
  augments?: string;
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
export interface WrapperLeaf {
  layer: string;
  /** e.g. `@widgets/forms/auth` */
  importPath: string;
  /** PascalCase segments after layer dir, e.g. ['Forms', 'Auth'] */
  segments: string[];
}

/** Represents a source file belonging to endpoints/. */
export interface EndpointLeaf {
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
// Phase 'globals':   populate globalThis synchronously.
//                    MUST come before anything that uses package namespace globals.
// Phase 'subsystems': depend on globals (endpoints, app-config).
// Phase 'render':     TanStack Router routeTree — evaluated last.
//
// ADR-034: 'wrappers' entry removed — barrel-registry is tree-shaken per-route
// via auto-import `import { Widgets } from '@capsule/registry'`, no side-effect needed.
// ---------------------------------------------------------------------------

type LayerPhase = 'globals' | 'subsystems' | 'render';

interface LayerEntry {
  name: string;
  phase: LayerPhase;
  /** Relative import path from bootstrap.tsx (inside .capsule/) */
  importPath: string;
}

export const LAYER_INIT_ORDER: readonly LayerEntry[] = [
  // Phase 1 — optional package globals (Maps, Render, etc.) — same phase
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
// Leaf parsing helpers (shared)
// ---------------------------------------------------------------------------

const segmentToPascal = (seg: string, isLast: boolean): string => {
  const cleaned = isLast ? seg.replace(/\.[^/.]+$/, '') : seg;
  return names(cleaned).className;
};

export const wrapperFileToLeaf = (
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

// ---------------------------------------------------------------------------
// Sub-generator: barrel registry (ADR-034)
//
// Generates .capsule/registry/**:
//   - registry/index.ts          → export * as Widgets from './widgets'; …
//   - registry/<layer>/index.ts  → export * as Folder from './folder'; (mid-nodes)
//                                   export { default as Leaf } from '@<layer>/...'; (leaves)
//   - registry/package.json      → { "sideEffects": false }
//
// No Object.assign(globalThis), no lazy() — bunder sees static import graph.
// ---------------------------------------------------------------------------

/**
 * Barrel content map keyed by output file path relative to registry/ dir.
 * Each value is the file content string.
 */
export type BarrelFiles = Map<string, string>;

/**
 * Generates all barrel files for a single layer.
 * Returns a map of relative path → file content.
 *
 * Algorithm:
 *  1. Build a tree of WrapperLeaf nodes keyed by PascalCase segments.
 *  2. Walk the tree recursively, emitting:
 *     - leaf node (no children): `export { default as Leaf } from '@layer/...';`
 *     - intermediate dir node: `export * as Child from './child';` for each child
 *       (may also have a leaf at same level — emit leaf export too)
 *  3. Each directory-level gets its own index.ts.
 */
const generateLayerBarrel = (layer: string, leaves: WrapperLeaf[]): BarrelFiles => {
  const files: BarrelFiles = new Map();
  if (leaves.length === 0) {
    // Empty layer: emit minimal valid barrel
    files.set(
      `${layer}/index.ts`,
      `// generated by CapsuleRegistryPlugin — не редактировать руками\nexport {};\n`,
    );
    return files;
  }

  const tree = buildTree(leaves);
  const HEADER = '// generated by CapsuleRegistryPlugin — не редактировать руками\n';

  const walk = (node: TreeNode<WrapperLeaf>, pathParts: string[]) => {
    const lines: string[] = [HEADER];
    const keys = [...node.children.keys()].sort();

    for (const key of keys) {
      const child = node.children.get(key)!;
      if (child.children.size === 0 && child.leaf) {
        // Pure leaf: export { default as Key } from '@layer/...';
        lines.push(`export { default as ${key} } from '${child.leaf.importPath}';`);
      } else {
        // Intermediate dir (may also have a leaf at same key-level — but our tree
        // structure puts leaf only at terminal nodes, so this means subdir)
        const subPath = [...pathParts, key.toLowerCase()];
        lines.push(`export * as ${key} from './${key.toLowerCase()}';`);
        walk(child, subPath);
      }
    }

    lines.push('');
    const relPath = pathParts.length > 0 ? `${pathParts.join('/')}/index.ts` : 'index.ts';
    files.set(relPath, lines.join('\n'));
  };

  walk(tree, [layer]);
  return files;
};

/**
 * Generates .capsule/registry/index.ts.
 * Exports all layer namespaces.
 */
export const generateRegistryIndex = (): string => {
  const lines = ['// generated by CapsuleRegistryPlugin — не редактировать руками'];
  const layerOrder = Object.keys(LAYER_TO_NAMESPACE) as Array<keyof typeof LAYER_TO_NAMESPACE>;
  for (const layer of layerOrder) {
    const ns = LAYER_TO_NAMESPACE[layer];
    lines.push(`export * as ${ns} from './${layer}';`);
  }
  lines.push('');
  return lines.join('\n');
};

/**
 * Generates .capsule/registry/package.json with sideEffects: false.
 * Required for bundler tree-shaking of barrel re-exports.
 */
export const generateRegistryPackageJson = (): string =>
  JSON.stringify({ sideEffects: false }, null, 2) + '\n';

/**
 * Main barrel-registry generator.
 * Returns a BarrelFiles map of all paths relative to registry/ that should be written.
 *
 * Stateless: (wrapperLeaves) => BarrelFiles.
 */
export const generateBarrelRegistry = (leaves: WrapperLeaf[]): BarrelFiles => {
  const all: BarrelFiles = new Map();

  // Per-layer barrels
  const byLayer: Record<string, WrapperLeaf[]> = {};
  for (const leaf of leaves) {
    if (!byLayer[leaf.layer]) byLayer[leaf.layer] = [];
    byLayer[leaf.layer].push(leaf);
  }

  for (const layer of Object.keys(LAYER_TO_NAMESPACE)) {
    const layerLeaves = byLayer[layer] ?? [];
    const layerFiles = generateLayerBarrel(layer, layerLeaves);
    for (const [path, content] of layerFiles) {
      all.set(path, content);
    }
  }

  // Root index.ts
  all.set('index.ts', generateRegistryIndex());

  // package.json with sideEffects: false
  all.set('package.json', generateRegistryPackageJson());

  return all;
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
  /** Keys from manifest.components (empty array if absent). */
  componentKeys: string[];
  /**
   * Kit namespace path from `manifest.augments` (e.g. `'Ui.Layout'`), if present.
   * Triggers augmentation Object.assign in codegen per ADR 046 D5.
   */
  augments: string | null;
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
): {
  name: string;
  controllerKeys: string[];
  componentKeys: string[];
  augments: string | null;
} | null => {
  const isTs = /\.[mc]?ts$/.test(fileName);
  const ast = parse(source, {
    sourceType: 'module',
    plugins: isTs ? ['typescript'] : [],
  });

  let foundName: string | null = null;
  let foundControllerKeys: string[] = [];
  let foundComponentKeys: string[] = [];
  let foundAugments: string | null = null;

  traverse(ast, {
    ObjectExpression(path) {
      // Already found — skip nested objects
      if (foundName !== null) return;

      let localName: string | null = null;
      let localControllerKeys: string[] | null = null;
      let localComponentKeys: string[] | null = null;
      let localAugments: string | null = null;

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
        } else if (keyName === 'components') {
          if (prop.value.type === 'ObjectExpression') {
            localComponentKeys = [];
            for (const compProp of prop.value.properties) {
              if (compProp.type !== 'ObjectProperty') continue;
              const compKey =
                compProp.key.type === 'Identifier'
                  ? compProp.key.name
                  : compProp.key.type === 'StringLiteral'
                    ? compProp.key.value
                    : null;
              if (compKey !== null) localComponentKeys.push(compKey);
            }
          }
        } else if (keyName === 'augments') {
          // Per ADR 046 D5 — string literal naming a kit Ui-namespace path
          // (e.g. 'Ui.Layout'). Codegen emits Object.assign at app boot.
          if (prop.value.type === 'StringLiteral') {
            localAugments = prop.value.value;
          }
        }
      }

      // Accept this ObjectExpression only if it has a `name` StringLiteral
      if (localName !== null) {
        foundName = localName;
        foundControllerKeys = localControllerKeys ?? [];
        foundComponentKeys = localComponentKeys ?? [];
        foundAugments = localAugments;
        path.stop();
      }
    },
  });

  if (foundName === null) return null;
  return {
    name: foundName,
    controllerKeys: foundControllerKeys,
    componentKeys: foundComponentKeys,
    augments: foundAugments,
  };
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
    console.warn(`[capsule-registry] could not read manifest file '${manifestFile}'. Skipping.`);
    return null;
  }

  // Step 3: parse via pure AST function
  let parsed: {
    name: string;
    controllerKeys: string[];
    componentKeys: string[];
    augments: string | null;
  } | null;
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

  return {
    name: resolvedName,
    controllerKeys: parsed?.controllerKeys ?? [],
    componentKeys: parsed?.componentKeys ?? [],
    augments: parsed?.augments ?? null,
  };
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
        componentKeys: info.componentKeys.length > 0 ? info.componentKeys : undefined,
        augments: info.augments ?? undefined,
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
 * `Controllers` namespace rather than overwriting it. Each key is assigned
 * individually so that app-level controllers are never shadowed:
 *
 *   (globalThis.Controllers ??= {}).Editor = Maps_mod.controllers.Editor;
 *
 * The packages entry in LAYER_INIT_ORDER has phase 'globals' and is the first
 * entry, evaluated before app-config.
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

  // Ui-namespace augmentation block (per ADR 046 D5 — augmentation pattern).
  // Manifest with `augments: 'Ui.Layout'` mutates Ui.Layout at app boot so
  // consumers can write `<Ui.Layout.Matrix/>` regardless of whether the variant
  // came from kit (Flex/Grid) or boost (Matrix). Tree-shake guarantee: app
  // without the boost in `packages: [...]` never imports the augmentation —
  // no member appears, no code shipped.
  const augmentsEntries = entries.filter((e) => e.augments);
  if (augmentsEntries.length > 0) {
    lines.push(`import { Ui as _Ui } from '@capsuletech/web-core/ui-kit';`);
    lines.push('');
    for (const { globalName, augments } of augmentsEntries) {
      // augments is a string like 'Ui.Layout'. Replace 'Ui' prefix with '_Ui'
      // (the codegen-local alias) and emit a direct Object.assign.
      const path = augments!.replace(/^Ui\b/, '_Ui');
      lines.push(`Object.assign(${path}, ${globalName}_mod.components);`);
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
 * `Controllers` interface using the same module-augmentation pattern:
 *
 *   interface Controllers {
 *     Editor: typeof import('@capsuletech/web-dnd/capsule')['default']['controllers']['Editor'];
 *   }
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
    lines.push(`  const ${globalName}: typeof import('${pkg}/capsule')['default']['components'];`);
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

  // Events namespace augmentation: namespace <Global> { type Events; namespace <Comp> { type Events } }
  // Merges with the const <Global> declaration above (value+type merge in declare global).
  //
  // Package-level <Pkg>.Events is an intersection of all component event types:
  //   type Events = (…Login extends { __events?: infer E } ? NonNullable<E> : {}) & (…Register…) & …
  //
  // NOTE: the aggregate uses `{}` (not `never`) when a component has no __events — otherwise the
  // intersection collapses to `never` and the whole type becomes useless. Per-component namespace
  // blocks (Pkg.Comp.Events) keep `: never` because there they are standalone and harmlessness holds.
  //
  // Collision note: if two components declare an event with the same name but different payload,
  // the intersection narrows the payload to the intersection of both payloads. Use per-component
  // Pkg.Comp.Events as an escape-hatch when you need to handle a component-specific overload.
  const componentEntries = entries.filter((e) => e.componentKeys && e.componentKeys.length > 0);
  for (const { pkg, globalName, componentKeys } of componentEntries) {
    lines.push(`  namespace ${globalName} {`);

    // Package-level aggregate: intersection of all component __events (using {} for no-events to avoid collapsing).
    const aggregateParts = componentKeys!.map(
      (compKey) =>
        `(typeof import('${pkg}/capsule')['default']['components'])[${JSON.stringify(compKey)}] extends { __events?: infer E } ? NonNullable<E> : {}`,
    );
    lines.push(`    // Aggregate of all component events. Use ${globalName}.Comp.Events for per-component granularity.`);
    lines.push(`    type Events = ${aggregateParts.join(' & ')};`);

    // Per-component namespace blocks (granularity + collision escape-hatch).
    for (const compKey of componentKeys!) {
      lines.push(`    namespace ${compKey} {`);
      lines.push(
        `      type Events = (typeof import('${pkg}/capsule')['default']['components'])[${JSON.stringify(compKey)}] extends { __events?: infer E } ? NonNullable<E> : never;`,
      );
      lines.push('    }');
    }
    lines.push('  }');
  }

  lines.push('}');

  // Ui-namespace augmentation (per ADR 046 D5). Per-package with `augments`,
  // emit module-augmentation of '@capsuletech/web-ui/<path>' so that
  // `Ui.<X>.<Member>` is type-checked in app TS without per-package .d.ts wiring.
  //
  // The kit module exports `interface ILayoutNamespace` (and equivalents for
  // map/chart/flow-diagram going forward) — we augment those interfaces with
  // the boost manifest's component keys.
  //
  // Mapping path → kit subpath + interface:
  //   'Ui.Layout'       → '@capsuletech/web-ui/layout' / ILayoutNamespace
  //   'Ui.Map'          → '@capsuletech/web-ui/map' / IMapNamespace             (when added)
  //   'Ui.Chart'        → '@capsuletech/web-ui/chart' / IChartNamespace         (when added)
  //   'Ui.FlowDiagram'  → '@capsuletech/web-ui/flow-diagram' / IFlowDiagramNamespace (when added)
  const augmentsEntries = entries.filter((e) => e.augments && e.componentKeys?.length);
  if (augmentsEntries.length > 0) {
    const augmentMap: Record<string, { subpath: string; iface: string } | undefined> = {
      'Ui.Layout': { subpath: '@capsuletech/web-ui/layout', iface: 'ILayoutNamespace' },
    };
    for (const { pkg, augments, componentKeys } of augmentsEntries) {
      const target = augmentMap[augments!];
      if (!target) continue;
      lines.push(`declare module '${target.subpath}' {`);
      lines.push(`  interface ${target.iface} {`);
      for (const key of componentKeys!) {
        lines.push(
          `    ${key}: (typeof import('${pkg}/capsule')['default']['components'])[${JSON.stringify(key)}];`,
        );
      }
      lines.push('  }');
      lines.push('}');
    }
  }

  lines.push('export {};');
  lines.push('');
  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Sub-generator: endpoints.ts (Phase: subsystems)
// ---------------------------------------------------------------------------

const ENDPOINTS_DIR = 'endpoints';

export const endpointFileToLeaf = (file: string, watchRoot: string): EndpointLeaf | null => {
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
  access?: Record<string, readonly string[]>;
  auth?: { session?: { storage?: 'local' | 'memory'; key?: string } };
}

export const renderAppTagsTypes = (tags: readonly string[], aliasKeys: readonly string[]): string => {
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
 * Options for conditional codegen in generateAppConfigRuntime.
 *
 * When hasAccess is true, the generator emits:
 *   import { setupAccess } from '@capsuletech/web-access';
 *   import { useAuth } from '@capsuletech/web-auth/session';
 *   if (appConfig.access) { setupAccess(appConfig.access, useAuth()); }
 *
 * Per ADR 047 D2 (no horizontal between domain): web-access runtime package
 * does NOT depend on web-auth domain. The app-level generator wires them via
 * IAuthCapability contract from web-contract/capabilities.
 *
 * When hasAuthSession is true, the generator emits:
 *   import { configureAuthSession } from '@capsuletech/web-auth/session';
 *   if (appConfig.auth?.session) { configureAuthSession(appConfig.auth.session); }
 *
 * Both imports are conditional so apps that set neither field get NO
 * web-access/web-auth import and no forced transitive dependency.
 */
export interface AppConfigRuntimeOpts {
  hasAccess?: boolean;
  hasAuthSession?: boolean;
}

/**
 * Generates .capsule/app-config.gen.ts.
 * Stateless: (aliases, opts?) => string.
 *
 * Import order inside this file:
 *  1. registerAliases — side-effect, uses aliases JSON only
 *  2. Optional: setupAccess — only when appConfig.access is declared
 *  3. Optional: configureAuthSession — only when appConfig.auth.session is declared
 *  4. import appConfigRaw — reactive capsule.app browser eval
 *  5. import endpoints — from registry (already in globalThis after wrappers)
 *  6. setApiClient — conditional, depends on appConfig.api
 *  7. applyIntlConfig — conditional, depends on appConfig.intl
 *  8. setupAccess call — conditional on appConfig.access
 *  9. configureAuthSession call — conditional on appConfig.auth?.session
 */
export const generateAppConfigRuntime = (
  aliases: Record<string, readonly string[]> | undefined,
  opts: AppConfigRuntimeOpts = {},
): string => {
  const aliasesLiteral = JSON.stringify(aliases ?? {}, null, 2);
  const { hasAccess = false, hasAuthSession = false } = opts;

  const lines: string[] = [
    '// generated by CapsuleRegistryPlugin — не редактировать руками',
    "import { registerAliases } from '@capsuletech/web-state';",
    "import { createApi, setApiClient } from '@capsuletech/web-query';",
    "import { type IAppConfig, applyIntlConfig } from '@capsuletech/web-core/app-config';",
  ];

  if (hasAccess) {
    lines.push("import { setupAccess } from '@capsuletech/web-access';");
    // useAuth needed as IAuthCapability arg to setupAccess (ADR 047 D2 —
    // web-access does NOT import web-auth directly; app wires the contract).
    lines.push("import { useAuth } from '@capsuletech/web-auth/session';");
  } else if (hasAuthSession) {
    // hasAccess already imports useAuth via web-auth/session for setupAccess wiring.
    // hasAuthSession alone gets configureAuthSession import; useAuth not needed.
  }
  if (hasAuthSession) {
    lines.push("import { configureAuthSession } from '@capsuletech/web-auth/session';");
  }

  lines.push(
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
    'if (appConfig.intl) {',
    '  applyIntlConfig(appConfig.intl);',
    '}',
  );

  if (hasAccess) {
    lines.push(
      '',
      'if (appConfig.access) {',
      '  setupAccess(appConfig.access, useAuth());',
      '}',
    );
  }
  if (hasAuthSession) {
    lines.push(
      '',
      'if (appConfig.auth?.session) {',
      '  configureAuthSession(appConfig.auth.session);',
      '}',
    );
  }

  lines.push('');
  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Sub-generator: bootstrap.tsx (generated, not static template)
//
// Import order is derived strictly from LAYER_INIT_ORDER phases:
//   Phase globals   → bare side-effect imports (no named binding)
//   Phase subsystems → bare side-effect imports
//   Phase render    → named import `{ routeTree }`
//
// ADR-034: 'wrappers' removed from LAYER_INIT_ORDER.
// Namespaces (Widgets/Views/…) are injected by auto-import at each call-site.
// Bootstrap no longer needs Object.assign(globalThis) side-effect.
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
    '/// <reference types="vite/client" />',
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
      // packages: runs Object.assign(globalThis, ...) for external pkg globals.
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
  lines.push('      transition={appConfig.router?.transition}');
  lines.push('    />');
  lines.push('  );');
  lines.push('};');
  lines.push('');

  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Sub-generator: layer-types.d.ts
//
// Generates .capsule/@types/layer-types.d.ts — ambient namespace type-members
// that let app code write:
//
//   type IIncident = Entities.Incident.Row;          // instead of typeof + $infer
//   const X = Widget<Features.Incidents>(…);         // instead of typeof Features.Incidents
//
// Mechanism: TS merges `const X` (value) + `namespace X { type Y = … }` (type-side)
// on the same identifier in `declare global`. The value-side globals come from
// the existing ambient `const Features/Controllers/Entities` declarations (packages.d.ts,
// auto-import generated capsule-imports.d.ts etc.) — we only add type-side namespace members.
//
// Only three layers get type-members:
//   Features    → type Leaf = (typeof import('@capsule/registry').Features)['Leaf']
//   Controllers → type Leaf = (typeof import('@capsule/registry').Controllers)['Leaf']
//   Entities    → namespace Leaf { type Row = (typeof import('@capsule/registry').Entities)['Leaf']['$infer'] }
//
// Nested paths use nested namespaces:
//   features/auth/login → namespace Features { namespace Auth { type Login = … } }
// ---------------------------------------------------------------------------

/** Layers that receive type-members (value, controller, entity) */
type TypedLayer = 'features' | 'controllers' | 'entities';

const TYPED_LAYERS = new Set<string>(['features', 'controllers', 'entities'] satisfies TypedLayer[]);

/**
 * Builds a segment access chain using single-quoted bracket notation.
 * e.g. ['Auth', 'Login'] → "['Auth']['Login']"
 */
const segmentChain = (segments: string[]): string =>
  segments.map((s) => `['${s}']`).join('');

/**
 * Renders the body of a namespace block recursively.
 *
 * For Features/Controllers a leaf at path [A, B, C] produces:
 *   namespace A {
 *     namespace B {
 *       type C = (typeof import('…').Features)['A']['B']['C'];
 *     }
 *   }
 *
 * For Entities a leaf at path [A] produces:
 *   namespace A {
 *     type Row = (typeof import('…').Entities)['A']['$infer'];
 *   }
 * A leaf at path [A, B] produces:
 *   namespace A {
 *     namespace B {
 *       type Row = (typeof import('…').Entities)['A']['B']['$infer'];
 *     }
 *   }
 *
 * @param segments  - Remaining PascalCase path segments to walk into
 * @param typeLine  - The `type X = …` line emitted at the innermost level
 * @param indent    - Current indentation for the lines in this call
 */
const renderNamespaceBody = (segments: string[], typeLine: string, indent: string): string => {
  if (segments.length === 1) {
    // Innermost level: emit type alias
    return [
      `${indent}namespace ${segments[0]} {`,
      `${indent}  ${typeLine}`,
      `${indent}}`,
    ].join('\n');
  }
  // Intermediate level: wrap in namespace and recurse
  const inner = renderNamespaceBody(segments.slice(1), typeLine, `${indent}  `);
  return [`${indent}namespace ${segments[0]} {`, inner, `${indent}}`].join('\n');
};

/**
 * Generates .capsule/@types/layer-types.d.ts.
 *
 * Stateless: (wrapperLeaves) => string.
 *
 * Empty leaves (or no typed-layer leaves) → minimal valid file (export {}).
 *
 * The file uses `declare global` + nested namespace declarations to add
 * type-side members to the ambient value-globals. No `@ts-nocheck`.
 *
 * All leaves for the same top-level namespace are merged into ONE
 * `namespace Ns { … }` block to avoid TS duplicate-namespace warnings
 * (even though TS merges them, a single block is cleaner).
 */
export const generateLayerTypes = (leaves: { layer: string; segments: string[] }[]): string => {
  const HEADER = '// generated by CapsuleRegistryPlugin — не редактировать руками';
  const REGISTRY_MOD = "'@capsule/registry'";

  // Filter to typed layers only
  const typedLeaves = leaves.filter((l) => TYPED_LAYERS.has(l.layer));

  if (typedLeaves.length === 0) {
    return [HEADER, 'export {};', ''].join('\n');
  }

  // Group by top-level namespace name (derived from LAYER_TO_NAMESPACE).
  // Each entry remembers its layer dir for entity detection.
  const byNs: Map<string, { segments: string[]; isEntity: boolean }[]> = new Map();
  for (const leaf of typedLeaves) {
    const ns = LAYER_TO_NAMESPACE[leaf.layer as keyof typeof LAYER_TO_NAMESPACE];
    if (!ns) continue;
    const isEntity = leaf.layer === 'entities';
    if (!byNs.has(ns)) byNs.set(ns, []);
    byNs.get(ns)!.push({ segments: leaf.segments, isEntity });
  }

  const lines: string[] = [HEADER, 'declare global {'];

  // Sort namespaces for deterministic output
  const sortedNs = [...byNs.keys()].sort();

  for (const ns of sortedNs) {
    const nsLeaves = byNs.get(ns)!.sort((a, b) =>
      a.segments.join('/').localeCompare(b.segments.join('/')),
    );

    lines.push(`  namespace ${ns} {`);

    for (const { segments, isEntity } of nsLeaves) {
      if (isEntity) {
        // Entity: namespace Incident { type Row = (…Entities)['Incident']['$infer'] }
        // The entire segments path forms the chain; Row is always the leaf type alias.
        const chain = segmentChain(segments) + "['$infer']";
        const typeLine = `type Row = (typeof import(${REGISTRY_MOD}).${ns})${chain};`;
        // All segments become nested namespaces; 'Row' is the leaf inside the innermost one.
        const block = renderNamespaceBody(segments, typeLine, '    ');
        lines.push(block);
      } else {
        // Feature / Controller: leaf segment is both the namespace key and the type name.
        // Intermediate segments become nested namespaces.
        const chain = segmentChain(segments);
        const leafName = segments[segments.length - 1];
        const typeLine = `type ${leafName} = (typeof import(${REGISTRY_MOD}).${ns})${chain};`;

        if (segments.length === 1) {
          // Flat: emit type directly inside the outer namespace block
          lines.push(`    ${typeLine}`);
        } else {
          // Nested: wrap intermediate segments (all but the last) in namespaces
          // The last segment is the type alias name (not a namespace).
          const block = renderNamespaceBody(segments.slice(0, -1), typeLine, '    ');
          lines.push(block);
        }
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
 *  ADR-034: barrel-backed registry
 *  - .capsule/registry/index.ts             (export * as Widgets/Views/… from './layer')
 *  - .capsule/registry/<layer>/index.ts     (barrel trees, export { default as X } at leaves)
 *  - .capsule/registry/package.json         ({ sideEffects: false })
 *  - .capsule/registry/packages.ts          (external package globals, Object.assign(globalThis))
 *  - .capsule/@types/packages.d.ts
 *  - .capsule/registry/endpoints.ts         (EndpointsRegistryPlugin replacement)
 *  - .capsule/@types/api.d.ts
 *  - .capsule/app-config.gen.ts             (AppConfigPlugin codegen replacement)
 *  - .capsule/@types/app-tags.d.ts
 *  - .capsule/@types/layer-types.d.ts       (NEW: ambient namespace type-members for Features/Controllers/Entities)
 *  - .capsule/bootstrap.tsx                 (NEW: generated, not static scaffold)
 *
 * Alias '@capsule/registry' → .capsule/registry/index.ts registered via configResolved hook.
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
  const registryDir = resolve(capsuleRoot, 'registry');
  const endpointsOut = resolve(capsuleRoot, 'registry', 'endpoints.ts');
  const apiTypesOut = resolve(capsuleRoot, '@types', 'api.d.ts');
  const appConfigRuntimeOut = resolve(capsuleRoot, 'app-config.gen.ts');
  const appTagsTypesOut = resolve(capsuleRoot, '@types', 'app-tags.d.ts');
  const packagesOut = resolve(capsuleRoot, 'registry', 'packages.ts');
  const packagesTypesOut = resolve(capsuleRoot, '@types', 'packages.d.ts');
  const layerTypesOut = resolve(capsuleRoot, '@types', 'layer-types.d.ts');
  const bootstrapOut = resolve(capsuleRoot, 'bootstrap.tsx');

  // Directory of capsule.app.ts — used as jiti root for manifest resolution.
  const appConfigDir = dirname(appConfigPath);

  // --- Flush helpers ---
  const flushBarrelRegistry = () => {
    if (!wrappersNeedsFlush) return;
    wrappersNeedsFlush = false;
    const leaves = [...knownWrappers.values()].sort((a, b) => {
      if (a.layer !== b.layer) return a.layer.localeCompare(b.layer);
      return a.segments.join('/').localeCompare(b.segments.join('/'));
    });
    const barrelFiles = generateBarrelRegistry(leaves);
    for (const [relPath, content] of barrelFiles) {
      writeOut(resolve(registryDir, relPath), content);
    }
    // Regenerate layer-types.d.ts alongside barrel registry (same trigger, same leaves).
    writeOut(layerTypesOut, generateLayerTypes(leaves));
    // Remove legacy wrappers.ts and slots.d.ts if they still exist from
    // a previous run before ADR-034 migration.
    const legacyWrappers = resolve(registryDir, 'wrappers.ts');
    const legacySlots = resolve(capsuleRoot, '@types', 'slots.d.ts');
    if (existsSync(legacyWrappers)) rmSync(legacyWrappers);
    if (existsSync(legacySlots)) rmSync(legacySlots);
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
    const hasAccess = Boolean(config?.access);
    const hasAuthSession = Boolean(config?.auth?.session);
    writeOut(appTagsTypesOut, renderAppTagsTypes(tags, aliasKeys));
    writeOut(appConfigRuntimeOut, generateAppConfigRuntime(aliases, { hasAccess, hasAuthSession }));

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

    flushBarrelRegistry();
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

    // --- ADR-034: register '@capsule/registry' alias via config() hook ---
    // Using config() (not configResolved) so the alias is applied before Vite
    // builds its dev-resolver. configResolved post-mutation is picked up by
    // Rolldown on build but is NOT seen by the dev-server resolver, causing
    // "Failed to resolve import '@capsule/registry'" in dev.
    //
    // capsuleRoot is known at plugin-factory time (closure), so no late binding
    // is needed — the path can be computed eagerly here.
    config(): UserConfig {
      const registryIndexPath = resolve(capsuleRoot, 'registry', 'index.ts');
      return {
        resolve: {
          alias: {
            '@capsule/registry': registryIndexPath,
          },
        },
      };
    },

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
          flushBarrelRegistry();
          flushEndpoints();
        },
      });
    },
  };
};
