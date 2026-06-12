/**
 * @capsuletech/web-shell — reusable app-shell blocks (chrome with logic) shared
 * across capsule apps.
 *
 * Tier-2 in the two-tier model: stateless structural composites live in
 * `@capsuletech/web-ui`; connected controls and logic-bearing blocks (mode
 * toggles, theme picker, and — later — Header) live here.
 *
 * The main barrel re-exports the `/ui` blocks for convenience. Framework-coupled
 * entry-points are kept on their own subpaths so they tree-shake independently:
 *   - `@capsuletech/web-shell/controllers` — HCA Controllers (web-core, ADR 032)
 *   - `@capsuletech/web-shell/capsule`     — registration manifest (ADR 033)
 */
export * from './ui';
