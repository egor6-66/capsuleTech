/**
 * manifestFetcher — manifest discovery + host import-map inspection (ADR 057).
 *
 * Pure functions, no Solid / DOM-mount side effects. Imported by RemoteProvider
 * (validate-on-mount) and RemoteComponent (resource for srcdoc / shadow-DOM
 * bootstrap).
 *
 * `readHostImportMap` is the runtime-side counterpart of vite-builder's
 * `ImportMapPlugin.buildImportMap` (Phase 1A). The transport boundary is the
 * `<script type="importmap">` DOM tag — `@capsuletech/vite-builder` is
 * build-time node-only, never imported at runtime per brief §"НЕ импортируй
 * SHARED_DEPS из vite-builder".
 */

import type { IRemoteManifest } from '../interfaces';

/**
 * Fetch a remote module's manifest from `${remoteUrl}/capsule.manifest.json`.
 * Validates the minimum shape; on failure rethrows with the remote URL in the
 * message so the source is identifiable at the call site.
 */
export const fetchManifest = async (remoteUrl: string): Promise<IRemoteManifest> => {
  const url = `${remoteUrl}/capsule.manifest.json`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      `[capsule/remote] manifest fetch failed: ${(err as Error).message} (${url})`,
    );
  }
  if (!res.ok) {
    throw new Error(`[capsule/remote] manifest fetch failed: ${res.status} ${url}`);
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    throw new Error(
      `[capsule/remote] manifest is not valid JSON: ${(err as Error).message} (${url})`,
    );
  }
  if (!isManifestShape(json)) {
    throw new Error(`[capsule/remote] manifest missing required fields (${url})`);
  }
  return json;
};

const isManifestShape = (v: unknown): v is IRemoteManifest => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === 'string' && typeof o.version === 'string' && typeof o.entry === 'string';
};

/**
 * Read the host page's `<script type="importmap">` content. Returns the parsed
 * object (`{ imports }`); on missing tag / parse error returns an empty map
 * (callers treat this as "no shared deps merged").
 *
 * The host's import-map is the actual deployable source of truth for shared
 * deps — emitted by `@capsuletech/vite-builder` `ImportMapPlugin` (Phase 1A).
 */
export const readHostImportMap = (): { imports: Record<string, string> } => {
  if (typeof document === 'undefined') return { imports: {} };
  const tag = document.querySelector('script[type="importmap"]');
  if (!tag?.textContent) return { imports: {} };
  try {
    const parsed = JSON.parse(tag.textContent) as { imports?: Record<string, string> };
    return { imports: parsed.imports ?? {} };
  } catch {
    return { imports: {} };
  }
};

/**
 * Parse a `/_shared/<pkg>@<version>/<rest>` URL into `{ pkg, version }`.
 * Handles `@scope/pkg` names (two `@` characters). Returns `null` on
 * malformed input — callers treat that as "skip this entry, can't validate".
 *
 * Symmetric to vite-builder's `parseSharedUrl` (importMap.ts) but trimmed —
 * here we only need `{ pkg, version }` for compat checking.
 */
export const parseSharedUrl = (url: string): { pkg: string; version: string } | null => {
  const PREFIX = '/_shared/';
  // Tolerate absolute URLs by stripping origin first.
  const path = url.includes('://') ? new URL(url).pathname : url;
  if (!path.startsWith(PREFIX)) return null;
  const rest = path.slice(PREFIX.length);
  if (!rest) return null;

  let pkgEnd: number;
  if (rest.startsWith('@')) {
    const firstSlash = rest.indexOf('/');
    if (firstSlash < 0) return null;
    const atAfterName = rest.indexOf('@', firstSlash + 1);
    if (atAfterName < 0) return null;
    pkgEnd = atAfterName;
  } else {
    pkgEnd = rest.indexOf('@');
    if (pkgEnd < 0) return null;
  }
  const pkg = rest.slice(0, pkgEnd);
  const afterAt = rest.slice(pkgEnd + 1);
  const versionEnd = afterAt.indexOf('/');
  if (versionEnd < 0) return null;
  const version = afterAt.slice(0, versionEnd);
  if (!pkg || !version) return null;
  return { pkg, version };
};

/**
 * Validate that every shared dep declared by the remote is present in the
 * host's import-map at the same version. Phase 1 — strict equality (semver
 * lands in Phase 2). Throws on mismatch with the offending dep + host vs
 * remote versions so the failure is actionable.
 *
 * Deps not listed in the host's import-map are also a fault — the remote
 * expects a singleton the host did not pin.
 */
export const validateSharedCompat = (
  remoteShared: Record<string, { version: string; singleton?: boolean }>,
  hostImports: Record<string, string>,
): void => {
  for (const [pkg, decl] of Object.entries(remoteShared)) {
    const hostUrl = hostImports[pkg];
    if (!hostUrl) {
      throw new Error(
        `[capsule/remote] shared dep '${pkg}' (remote wants ${decl.version}) is not pinned in host import-map`,
      );
    }
    const parsed = parseSharedUrl(hostUrl);
    if (!parsed) {
      // Host pinned via a non-/_shared/ URL — can't compare. Tolerate
      // silently: a hand-pinned URL is an intentional host opt-out from
      // capsule-builder versioning.
      continue;
    }
    if (parsed.version !== decl.version) {
      throw new Error(
        `[capsule/remote] shared dep '${pkg}' version mismatch: host ${parsed.version} vs remote ${decl.version}`,
      );
    }
  }
};
