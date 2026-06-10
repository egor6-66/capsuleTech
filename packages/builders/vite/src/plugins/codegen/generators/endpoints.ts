/**
 * SubGenerator: endpoints.ts + api.d.ts + defineEndpoint transform
 *
 * Generates:
 *   .capsule/registry/endpoints.ts      (import * as alias + endpoints object)
 *   .capsule/@types/api.d.ts            (declare global CapsuleApi)
 *
 * Also provides enforce:'pre' transform that injects `defineEndpoint` import
 * into every src/endpoints/** file that doesn't already have it.
 *
 * order: 20
 */

import { dirname, relative, resolve } from 'node:path';
import {
  type EndpointLeaf,
  endpointFileToLeaf,
  generateEndpointsRuntime,
  generateEndpointsTypes,
} from '../../capsuleRegistry';
import { DEFINE_FACTORIES } from '../../constants';
import type { CodegenContext, SubGenerator } from '../interfaces';

const ENDPOINTS_DIR = 'endpoints';

// Eagerly build the factory constants (same as capsuleRegistry.ts original).
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

const normalizePath = (p: string): string => p.split('?')[0].replace(/\\/g, '/');

export const createEndpointsSubGenerator = (): SubGenerator => {
  const knownEndpoints = new Map<string, EndpointLeaf>();
  let dirty = false;
  // Computed once in first flush (ctx available then).
  let srcRelFromRegistry: string | null = null;
  let absEndpointsDir: string | null = null;

  const getSrcRelFromRegistry = (ctx: CodegenContext): string => {
    if (srcRelFromRegistry !== null) return srcRelFromRegistry;
    const out = resolve(ctx.capsuleRoot, 'registry', 'endpoints.ts');
    srcRelFromRegistry = relative(dirname(out), ctx.watchDir).split(/[\\/]/).join('/') || '.';
    return srcRelFromRegistry;
  };

  const getAbsEndpointsDir = (ctx: CodegenContext): string => {
    if (absEndpointsDir !== null) return absEndpointsDir;
    absEndpointsDir = resolve(ctx.watchDir, ENDPOINTS_DIR);
    return absEndpointsDir;
  };

  return {
    id: 'endpoints',
    order: 20,

    match(_file: string): boolean {
      // All files — we filter by ENDPOINTS_DIR in onEvent.
      return true;
    },

    onEvent(ev, file, ctx): boolean {
      const leaf = endpointFileToLeaf(file, ctx.watchDir);
      if (!leaf) return false;
      const key = leaf.segments.join('/');
      if (ev === 'add' || ev === 'addDir') {
        knownEndpoints.set(key, leaf);
      } else if (ev === 'unlink' || ev === 'unlinkDir') {
        knownEndpoints.delete(key);
      }
      dirty = true;
      return true;
    },

    flush(ctx, forced): void {
      if (!dirty && !forced) return;
      dirty = false;

      const leaves = [...knownEndpoints.values()].sort((a, b) =>
        a.segments.join('/').localeCompare(b.segments.join('/')),
      );

      ctx.writeOut(
        resolve(ctx.capsuleRoot, 'registry', 'endpoints.ts'),
        generateEndpointsRuntime(leaves, getSrcRelFromRegistry(ctx)),
      );
      ctx.writeOut(resolve(ctx.capsuleRoot, '@types', 'api.d.ts'), generateEndpointsTypes());
    },

    transform(code, id, ctx): { code: string; map: null } | null {
      const normId = normalizePath(id);
      const normEndpointsDir = getAbsEndpointsDir(ctx).replace(/\\/g, '/');
      if (normId.startsWith(normEndpointsDir + '/') && /\.[jt]sx?$/.test(normId)) {
        if (ENDPOINT_FACTORY.alreadyImportedRe.test(code)) return null;
        return {
          code: `${ENDPOINT_FACTORY.importLine}\n${code}`,
          map: null,
        };
      }
      return null;
    },

    bootstrap(_ctx): null {
      // endpoints.ts is imported by app-config.gen.ts, not directly in bootstrap.
      return null;
    },
  };
};
