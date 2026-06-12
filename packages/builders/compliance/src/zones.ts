/**
 * Zone-canon compliance per ADR 047 D1 / D2 (Phase D3).
 *
 * `packages/web/<zone>/<pkg>/` files are classified by their physical zone
 * (kit / runtime / domain / boost / design-time). Imports across `@capsuletech/web-*`
 * and `@capsuletech/boost-*` are validated against `ZONE_ALLOWED_DEPS` —
 * forbidden directions emit a `cross-zone-import` violation.
 *
 * Cross-domain → cross-domain canon: forbidden direct imports between domain
 * packages (use `@capsuletech/web-contract` for cross-domain capabilities).
 *
 * Vendor packages (`shared-zod`, `shared-utils`, `vite-builder`, `lib-builder`,
 * `compliance`, `cli`) are allowed everywhere as shared infrastructure.
 */

export type Zone = 'kit' | 'runtime' | 'domain' | 'boost' | 'design-time';

const ZONE_RX: Array<[Zone, RegExp]> = [
  ['kit', /[\\/]packages[\\/]web[\\/]kit[\\/]/],
  ['runtime', /[\\/]packages[\\/]web[\\/]runtime[\\/]/],
  ['domain', /[\\/]packages[\\/]web[\\/]domain[\\/]/],
  ['boost', /[\\/]packages[\\/]web[\\/]boost[\\/]/],
  ['design-time', /[\\/]packages[\\/]web[\\/]design-time[\\/]/],
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
 * Returns null if path is not zone-classified.
 */
export const extractZonePackage = (absPath: string, zone: Zone | null): string | null => {
  if (!zone) return null;
  const rx = new RegExp(`[\\\\/]packages[\\\\/]web[\\\\/]${zone}[\\\\/]([^\\\\/]+)[\\\\/]`);
  const m = absPath.match(rx);
  return m ? m[1] : null;
};

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

  // design-time
  '@capsuletech/studio': 'design-time',
};

/**
 * Zone X can import from any zone in `ZONE_ALLOWED_DEPS[X]`.
 *
 * Per ADR 047 D1:
 * - **kit** — only kit + runtime/web-style (peer). NO boost/domain/design-time.
 * - **runtime** — runtime + kit. No cycles.
 * - **boost** — kit + runtime. NOT domain. NOT another boost.
 * - **domain** — kit + runtime + boost. NOT another domain (use web-contract).
 * - **design-time** — anything except apps.
 *
 * Same-zone imports are always allowed.
 */
export const ZONE_ALLOWED_DEPS: Record<Zone, ReadonlySet<Zone>> = {
  kit: new Set<Zone>(['kit', 'runtime']),
  runtime: new Set<Zone>(['runtime', 'kit']),
  boost: new Set<Zone>(['boost', 'kit', 'runtime']),
  domain: new Set<Zone>(['domain', 'kit', 'runtime', 'boost']),
  // Design-time can use everything else; same-domain merges allowed.
  'design-time': new Set<Zone>(['design-time', 'kit', 'runtime', 'boost', 'domain']),
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
