/**
 * SubGenerator: app-config.gen.ts + app-tags.d.ts
 *
 * Generates:
 *   .capsule/app-config.gen.ts      (registerAliases + createApi + setApiClient)
 *   .capsule/@types/app-tags.d.ts   (declare global CapsuleTags / CapsuleAliases)
 *
 * Also provides the defineAppConfig identity-unwrap transform for capsule.app.ts.
 *
 * Triggered by:
 *   - initial scan (forced flush)
 *   - capsule.app.ts change (onAppConfigChange)
 *   - no src file events (app-config doesn't react to src file additions)
 *
 * order: 30
 */

import { resolve } from 'node:path';
import {
  type AppConfigRuntimeOpts,
  generateAppConfigRuntime,
  renderAppTagsTypes,
} from '../../capsuleRegistry';
import type { AppConfigShape, CodegenContext, SubGenerator } from '../interfaces';

const normalizePath = (p: string): string => p.split('?')[0].replace(/\\/g, '/');

export const createAppConfigSubGenerator = (opts?: {
  onAppConfigLoad?: (config: AppConfigShape) => void;
}): SubGenerator => {
  let dirty = false;

  return {
    id: 'app-config',
    order: 30,

    match(_file: string): boolean {
      // app-config doesn't react to src file structure events.
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

      const config = ctx.loadAppConfig();

      if (!config) {
        ctx.writeOut(
          resolve(ctx.capsuleRoot, '@types', 'app-tags.d.ts'),
          renderAppTagsTypes([], []),
        );
        ctx.writeOut(
          resolve(ctx.capsuleRoot, 'app-config.gen.ts'),
          generateAppConfigRuntime(undefined),
        );
        opts?.onAppConfigLoad?.({});
        return;
      }

      const tags = config?.meta?.tags ?? [];
      const aliases = config?.aliases ?? {};
      const aliasKeys = Object.keys(aliases);
      const runtimeOpts: AppConfigRuntimeOpts = {
        hasAccess: Boolean(config?.access),
        hasAuthSession: Boolean(config?.auth?.session),
      };

      ctx.writeOut(
        resolve(ctx.capsuleRoot, '@types', 'app-tags.d.ts'),
        renderAppTagsTypes(tags, aliasKeys),
      );
      ctx.writeOut(
        resolve(ctx.capsuleRoot, 'app-config.gen.ts'),
        generateAppConfigRuntime(aliases, runtimeOpts),
      );

      opts?.onAppConfigLoad?.(config);
    },

    transform(code, id, ctx): { code: string; map: null } | null {
      const normId = normalizePath(id);
      const targetAppConfigPath = normalizePath(ctx.appConfigPath);

      if (normId !== targetAppConfigPath) return null;

      const re = /\bdefineAppConfig(?=\s*\()/g;
      if (re.test(code)) {
        re.lastIndex = 0;
        return {
          code: code.replace(re, '((__x__)=>__x__)'),
          map: null,
        };
      }
      return null;
    },

    bootstrap(_ctx): { phase: 'subsystems'; importPath: string } {
      return { phase: 'subsystems', importPath: './app-config.gen' };
    },
  };
};
