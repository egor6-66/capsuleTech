/**
 * Zone-canon compliance per ADR 047 D1 / D2 (Phase D3) + D6 (Phase D6, 2026-06-12).
 *
 * `packages/web/<zone>/<pkg>/` files are classified by their physical zone
 * (kit / runtime / domain / boost / studio). Imports across `@capsuletech/web-*`
 * and `@capsuletech/boost-*` are validated against `ZONE_ALLOWED_DEPS` —
 * forbidden directions emit a `cross-zone-import` violation.
 *
 * Cross-domain → cross-domain canon: forbidden direct imports between domain
 * packages (use `@capsuletech/web-contract` for cross-domain capabilities).
 *
 * Vendor packages (`shared-zod`, `shared-utils`, `vite-builder`, `lib-builder`,
 * `compliance`, `cli`) are allowed everywhere as shared infrastructure.
 */

export type Zone = 'kit' | 'runtime' | 'domain' | 'boost' | 'studio';

const ZONE_RX: Array<[Zone, RegExp]> = [
  ['kit', /[\\/]packages[\\/]web[\\/]kit[\\/]/],
  ['runtime', /[\\/]packages[\\/]web[\\/]runtime[\\/]/],
  ['domain', /[\\/]packages[\\/]web[\\/]domain[\\/]/],
  ['boost', /[\\/]packages[\\/]web[\\/]boost[\\/]/],
  ['studio', /[\\/]packages[\\/]web[\\/]studio[\\/]/],
];

/**
 * Returns the zone the file belongs to, or null if it's not under packages/web/.
 *
 * Tests (`*.test.ts(x)` / `*.spec.ts(x)`) and `.capsule/` generated files
 * are excluded — caller filters those upstream.
 */
export const classifyZone = (absPath: string): Zone | null => {
  if (!absPath) return null;
  for (const [zone, rx] of ZONE_RX) {
    if (rx.test(absPath)) return zone;
  }
  return null;
};

/**
 * Extract package name from path inside packages/web/<zone>/<pkg>/.
 *
 * `packages/web/runtime/core/src/...` → 'core'
 *
 * Sole-inhabitant zones (post-D6 `studio`) have NO `<pkg>` subdir — the zone IS
 * the package. For these, returns the zone name directly.
 *
 * Returns null if path is not zone-classified.
 */
export const extractZonePackage = (absPath: string, zone: Zone | null): string | null => {
  if (!zone) return null;
  // Sole-inhabitant zone — package dir == zone name (e.g. studio).
  if (zone === 'studio') return 'studio';
  const rx = new RegExp(`[\\\\/]packages[\\\\/]web[\\\\/]${zone}[\\\\/]([^\\\\/]+)[\\\\/]`);
  const m = absPath.match(rx);
  return m ? m[1] : null;
};

/**
 * Package-dir names that map to npm packages WITHOUT `web-` / `boost-` prefix.
 *
 * Exceptions to the «<zone-prefix>-<pkg-dir>» rule. Currently:
 *   - `data-gen` (runtime/data-gen → @capsuletech/data-gen) — package-scoped
 *     util, no `web-` prefix to keep the name short for app consumers.
 *
 * `studio` is handled separately (whole zone) — see check.ts path-reconstruction.
 */
export const NO_PREFIX_PKG_DIRS = new Set<string>(['data-gen']);

/**
 * Maps `@capsuletech/<pkg>` names to their zone per ADR 047 D1.
 *
 * Stable since Phase D1 (closed 2026-06-12). New packages registered here
 * when scaffolded; misclassified imports become compliance warnings.
 *
 * Convention names not in this map (e.g. `@capsuletech/shared-zod`,
 * `@capsuletech/cli`, `@capsuletech/vite-builder`) are treated as shared
 * infrastructure — allowed everywhere.
 */
export const PACKAGE_TO_ZONE: Record<string, Zone> = {
  // kit
  '@capsuletech/web-ui': 'kit',

  // runtime
  '@capsuletech/web-core': 'runtime',
  '@capsuletech/web-state': 'runtime',
  '@capsuletech/web-router': 'runtime',
  '@capsuletech/web-query': 'runtime',
  '@capsuletech/web-style': 'runtime',
  '@capsuletech/web-renderer': 'runtime',
  '@capsuletech/web-dnd': 'runtime',
  '@capsuletech/web-intl': 'runtime',
  '@capsuletech/web-date': 'runtime',
  '@capsuletech/web-profiler': 'runtime',
  '@capsuletech/web-remote': 'runtime',
  '@capsuletech/web-contract': 'runtime',
  '@capsuletech/web-access': 'runtime',
  '@capsuletech/data-gen': 'runtime',

  // domain
  '@capsuletech/web-auth': 'domain',
  '@capsuletech/web-shell': 'domain',
  '@capsuletech/web-agent': 'domain',

  // boost
  '@capsuletech/boost-table': 'boost',
  '@capsuletech/boost-map': 'boost',
  '@capsuletech/boost-flow': 'boost',
  '@capsuletech/boost-chart': 'boost',
  '@capsuletech/boost-layout': 'boost',

  // studio (host/composer; per ADR 047 D6 retired `design-time` parent zone)
  '@capsuletech/web-studio': 'studio',
};

/**
 * Zone X can import from any zone in `ZONE_ALLOWED_DEPS[X]`.
 *
 * Per ADR 047 D1 + D6:
 * - **kit** — only kit + runtime/web-style (peer). NO boost/domain/studio.
 * - **runtime** — runtime + kit. No cycles.
 * - **boost** — kit + runtime. NOT domain. NOT another boost.
 * - **domain** — kit + runtime + boost. NOT another domain (use web-contract).
 * - **studio** — host/composer; can consume everything else (apps excluded).
 *
 * Same-zone imports are always allowed.
 */
export const ZONE_ALLOWED_DEPS: Record<Zone, ReadonlySet<Zone>> = {
  kit: new Set<Zone>(['kit', 'runtime']),
  runtime: new Set<Zone>(['runtime', 'kit']),
  boost: new Set<Zone>(['boost', 'kit', 'runtime']),
  domain: new Set<Zone>(['domain', 'kit', 'runtime', 'boost']),
  // Studio is the host/composer — pulls from everything else (apps excluded).
  studio: new Set<Zone>(['studio', 'kit', 'runtime', 'boost', 'domain']),
};

/**
 * Check whether an import from `fromZone` to `targetZone` is allowed.
 *
 * Special cases:
 * - Same zone but different packages — allowed in all zones EXCEPT domain
 *   (no domain ↔ domain direct imports; use web-contract).
 * - Same zone but different boost packages — allowed (e.g. boost-layout +
 *   boost-table can coexist via apps, but cross-import between boosts is
 *   architecturally suspect; still allowed since hard cases TBD).
 */
export const isZoneImportAllowed = (
  fromZone: Zone,
  fromPkg: string,
  targetZone: Zone,
  targetPkg: string,
): boolean => {
  // Cross-domain direct import is the canonical no-no per ADR 047 D2.
  if (fromZone === 'domain' && targetZone === 'domain' && fromPkg !== targetPkg) {
    return false;
  }
  return ZONE_ALLOWED_DEPS[fromZone].has(targetZone);
};
