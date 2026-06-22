/**
 * buildSrcdoc — pure function generating the iframe srcdoc HTML.
 *
 * The srcdoc is intentionally SHORT — it only injects bootstrap parameters
 * (NAME / INSTANCE_ID / SESSION_ID / ENTRY) and a <script> tag loading boot.js.
 * All shell logic lives in boot.js (dist-asset), not inline here.
 *
 * ADR-053 consequences-negative: shell logic is too heavy for inline srcdoc.
 *
 * Phase 1b — Multi-Solid singleton fix (ADR-053 consequence 7b, Variant C):
 * Injects `<script type="importmap">` as the FIRST tag in <head>, before any
 * `<script type="module">`. HTML spec: an import-map after the first module-script
 * is ignored by the parser. All `import 'solid-js'` inside boot.js and the remote
 * entry resolve to the host-origin URL — the same instance already loaded by the
 * host app. This eliminates the multi-Solid warning and restores end-to-end
 * reactive props (ctx.props.X tracked by Solid effects in remote.ts).
 *
 * IMPORTANT (future maintainers): do NOT remove the import-map tag or move it
 * after the first <script type="module">. See docs/_meta/web-remote.md
 * §singleton-invariant > «Multi-Solid resolution (Variant C, import-map inject)».
 *
 * Dev vs prod paths:
 * - Dev (Vite): solid-js is pre-bundled into `/node_modules/.vite/deps/solid-js.js`
 *   (configured via optimizeDeps.include in capsuleConfig.ts). Default paths in
 *   buildSolidImportMap (/node_modules/solid-js/dist/solid.js) do NOT match.
 *   Therefore buildSrcdoc accepts an optional `solidPaths` override and
 *   RemoteComponent passes Vite-dev paths derived from the host's import.meta.
 * - Prod: hashed asset paths — override via `solidPaths`. Phase 2+ concern.
 */

import { renderSolidImportMapTag } from '@capsuletech/web-core/bootstrap';
import type { SolidImportSpecifier } from '@capsuletech/web-core/bootstrap';
import type { IRemoteManifest, IRemoteModuleConfig } from '../interfaces';

export interface IBuildSrcdocParams {
  name: string;
  instanceId: string;
  sessionId: string;
  module: IRemoteModuleConfig;
  manifest: IRemoteManifest;
  /** Resolved URL for boot.js (via Vite `?url` import). */
  bootUrl: string;
  /**
   * Origin of the host page (e.g. `window.location.origin`).
   * Used to build the solid-js import-map pointing iframe imports to the
   * already-loaded host instance (multi-Solid singleton fix, Phase 1b).
   */
  hostOrigin: string;
  /**
   * Optional override: specifier → path from origin root.
   * Defaults produce Vite-dev paths (/node_modules/.vite/deps/...).
   * Pass prod hashed paths when building for production (Phase 2+).
   */
  solidPaths?: Partial<Record<SolidImportSpecifier, string>>;
}

/**
 * Returns a minimal HTML document string to use as iframe srcdoc.
 * Injects __CAPSULE_REMOTE__ global with bootstrap parameters, then loads boot.js.
 *
 * JSON.stringify escapes the parameter values — prevents injection if `name`
 * somehow contains user content (defensive practice).
 *
 * HEAD order invariant (do not change):
 *   1. <meta charset="utf-8">
 *   2. <script type="importmap"> ← MUST be before any module-script (HTML spec)
 *   3. <link rel="stylesheet"> (optional, manifest.styles)
 * BODY:
 *   4. <div id="capsule-remote-root">
 *   5. <script> window.__CAPSULE_REMOTE__ = {...} </script>  ← classic script, ok after importmap
 *   6. <script type="module" src="${bootUrl}">  ← first module-script (after importmap)
 */
export const buildSrcdoc = (params: IBuildSrcdocParams): string => {
  const { name, instanceId, sessionId, module, manifest, bootUrl, hostOrigin, solidPaths } =
    params;

  const stylesHtml = (manifest.styles ?? [])
    .map((s) => `<link rel="stylesheet" href="${new URL(s, module.url).href}">`)
    .join('\n  ');

  const bootstrapParams = JSON.stringify({
    name,
    instanceId,
    sessionId,
    entry: new URL(manifest.entry, module.url).href,
  });

  const importMapTag = renderSolidImportMapTag(hostOrigin, solidPaths);

  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  ${importMapTag}
  ${stylesHtml}
</head><body style="margin:0">
  <div id="capsule-remote-root"></div>
  <script>window.__CAPSULE_REMOTE__ = ${bootstrapParams};</script>
  <script type="module" src="${bootUrl}"></script>
</body></html>`;
};
