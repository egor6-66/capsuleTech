/**
 * `@capsuletech/web-shell/layout` — tier-1 stateless layout primitives (ADR 045).
 *
 * Structural scaffolding: Matrix, Region, Cell.
 * No stores, no `useEmit`, no DOM side-effects.
 *
 * Old `/matrix` subpath is a deprecated alias for this one.
 * Consumers should migrate to `/layout` on next touch.
 */
export * from '../matrix';
