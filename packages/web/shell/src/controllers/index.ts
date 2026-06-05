/**
 * @capsuletech/web-shell/controllers — HCA integration layer (ADR 032).
 *
 * This is the only subpath that depends on `@capsuletech/web-core`. It will ship
 * package-level Controllers (e.g. `Controllers.Shell` for the Header: active
 * route, menu open/close FSM) wired through `useEmit`, registered into the app's
 * global `Controllers.*` namespace via the package-registration mechanism
 * (ADR 033 phase 3 — currently pending).
 *
 * Empty until the Header block lands. Kept as a present entry-point so the
 * multi-entry build and the `/controllers` subpath contract stay stable.
 */

export {};
