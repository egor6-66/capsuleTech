/**
 * @capsuletech/web-core/bootstrap
 *
 * Unified bootstrap helpers for Capsule apps (standalone + embedded).
 *
 * @example
 * // Standalone:
 * import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
 * createCapsuleApp(document.getElementById('root')!, { routeTree, appConfig });
 *
 * @example
 * // Embedded (remote.ts):
 * import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
 * import type { IRemoteBootstrap } from '@capsuletech/web-remote';
 *
 * export const bootstrap: IRemoteBootstrap = (root, ctx) =>
 *   createCapsuleApp(root, {
 *     routeTree,
 *     appConfig,
 *     configOverride: ctx.config,
 *     runtimeProps: ctx.props,
 *     eventSink: ctx.channel,
 *   });
 *
 * @example
 * // Multi-Solid shim (owner-web-remote, buildSrcdoc.ts):
 * import { renderSolidImportMapTag } from '@capsuletech/web-core/bootstrap';
 * const srcdoc = `<head>${renderSolidImportMapTag(hostOrigin)}</head>...`;
 *
 * @module
 */

export { createCapsuleApp, type ICreateCapsuleAppOptions } from './createCapsuleApp';
export { EmitContext, EmitProvider, type IEmitSink, useEmitSink } from './EmitProvider';
export {
  buildSolidImportMap,
  renderSolidImportMapTag,
  SOLID_IMPORT_SPECIFIERS,
  type SolidImportSpecifier,
} from './solidBundleShim';
