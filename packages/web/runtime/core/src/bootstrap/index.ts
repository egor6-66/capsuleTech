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
 * // Embedded: тот же вызов. Handshake включается автоматически, если app внутри
 * // хост-iframe (ADR 059). `eventSink` (опц.) — канал useEmit-событий к хосту:
 * import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
 * createCapsuleApp(root, { routeTree, appConfig, eventSink: hostChannel });
 *
 * @example
 * // Host-side (web-remote, Brief 3) импортирует протокол как контракт:
 * import { EMBED_PROTOCOL } from '@capsuletech/web-core/bootstrap';
 * // слушает EMBED_PROTOCOL.readyEvent, отвечает EMBED_PROTOCOL.configEvent.
 *
 * @example
 * // Multi-Solid shim (owner-web-remote, buildSrcdoc.ts):
 * import { renderSolidImportMapTag } from '@capsuletech/web-core/bootstrap';
 * const srcdoc = `<head>${renderSolidImportMapTag(hostOrigin)}</head>...`;
 *
 * @module
 */

export { createCapsuleApp, type ICreateCapsuleAppOptions } from './createCapsuleApp';
export {
  createConfigStore,
  filterOverride,
  type IConfigStore,
  mergeConfigOverride,
} from './embedConfig';
export {
  DEFAULT_HANDSHAKE_TIMEOUT_MS,
  EMBED_PROTOCOL,
  type IAppReadyMessage,
  type IEmbedParams,
  isEmbedded,
  readEmbedParams,
  startHandshake,
} from './embedHandshake';
export { EmitContext, EmitProvider, type IEmitSink, useEmitSink } from './EmitProvider';
export {
  buildSolidImportMap,
  renderSolidImportMapTag,
  SOLID_IMPORT_SPECIFIERS,
  type SolidImportSpecifier,
} from './solidBundleShim';
