/**
 * buildSrcdoc — pure function generating the iframe srcdoc HTML.
 *
 * The srcdoc is intentionally SHORT — it only injects bootstrap parameters
 * (NAME / INSTANCE_ID / SESSION_ID / ENTRY) and a <script> tag loading boot.js.
 * All shell logic lives in boot.js (dist-asset), not inline here.
 *
 * ADR-053 consequences-negative: shell logic is too heavy for inline srcdoc.
 */

import type { IRemoteManifest, IRemoteModuleConfig } from '../interfaces';

export interface IBuildSrcdocParams {
  name: string;
  instanceId: string;
  sessionId: string;
  module: IRemoteModuleConfig;
  manifest: IRemoteManifest;
  /** Resolved URL for boot.js (via Vite `?url` import). */
  bootUrl: string;
}

/**
 * Returns a minimal HTML document string to use as iframe srcdoc.
 * Injects __CAPSULE_REMOTE__ global with bootstrap parameters, then loads boot.js.
 *
 * JSON.stringify escapes the parameter values — prevents injection if `name`
 * somehow contains user content (defensive practice).
 */
export const buildSrcdoc = (params: IBuildSrcdocParams): string => {
  const { name, instanceId, sessionId, module, manifest, bootUrl } = params;

  const stylesHtml = (manifest.styles ?? [])
    .map((s) => `<link rel="stylesheet" href="${new URL(s, module.url).href}">`)
    .join('\n  ');

  const bootstrapParams = JSON.stringify({
    name,
    instanceId,
    sessionId,
    entry: new URL(manifest.entry, module.url).href,
  });

  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  ${stylesHtml}
</head><body style="margin:0">
  <div id="capsule-remote-root"></div>
  <script>window.__CAPSULE_REMOTE__ = ${bootstrapParams};</script>
  <script type="module" src="${bootUrl}"></script>
</body></html>`;
};