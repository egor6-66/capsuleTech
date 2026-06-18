/**
 * SubGenerator: registry/packages.ts + @types/packages.d.ts
 *
 * Generates:
 *   .capsule/registry/packages.ts     (import + Object.assign(globalThis) for external pkgs)
 *   .capsule/@types/packages.d.ts     (declare global const + Controllers interface)
 *
 * Triggered by:
 *   - initial scan (forced flush — needs loaded appConfig)
 *   - capsule.app.ts change (onAppConfigChange — package list may have changed)
 *
 * No src file events trigger this sub-gen; package list comes from capsule.app.ts.
 *
 * order: 40
 */

import { resolve } from 'node:path';
import { generatePackagesRuntime, generatePackagesTypes, resolvePackageEntries } from '../../capsuleRegistry';
import type { CodegenContext, SubGenerator } from '../interfaces';
import { dirname } from 'node:path';

export const createPackagesSubGenerator = (): SubGenerator => {
  let dirty = false;

  return {
    id: 'packages',
    order: 40,

    match(_file: string): boolean {
      return false;
    },

    onEvent(_ev, _file, _ctx): boolean {
      return false;
    },

    onAppConfigChange(_ctx: CodegenContext): boolean {
      dirty = true;
      return true;
    },

    flush(ctx, forced): void {
      if (!dirty && !forced) return;
      dirty = false;

      const result = ctx.loadAppConfig();

      if (result.status === 'error') {
        // Transient load error — keep existing output, log the error.
        ctx.logger?.error(
          `[capsule:packages] failed to load appConfig: ${String(result.error)}`,
        );
        return;
      }

      const config = result.status === 'ok' ? result.config : undefined;
      const appConfigDir = dirname(ctx.appConfigPath);
      const resolvedPackages = resolvePackageEntries(config?.packages, appConfigDir);

      ctx.writeOut(
        resolve(ctx.capsuleRoot, 'registry', 'packages.ts'),
        generatePackagesRuntime(resolvedPackages),
      );
      ctx.writeOut(
        resolve(ctx.capsuleRoot, '@types', 'packages.d.ts'),
        generatePackagesTypes(resolvedPackages),
      );
    },

    bootstrap(_ctx): { phase: 'globals'; importPath: string } {
      return { phase: 'globals', importPath: './registry/packages' };
    },
  };
};
