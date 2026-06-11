import type { Accessor } from 'solid-js';
import { useMatches } from '@tanstack/solid-router';

/**
 * Returns the depth of the current Outlet in the route hierarchy.
 * Root layout = 0; nested layout = 1; its child = 2; ...
 *
 * Used by Shell.Matrix to scope view-transition-name per Outlet level
 * so independent layouts don't share a transition group (ADR 045 #3).
 *
 * Implementation: derives depth from TanStack `useMatches()` — a reactive
 * `Accessor<RouteMatch[]>` over all currently active route matches.
 * Each active match corresponds to one layout level in the route tree.
 * Root match counts as depth 0, so depth = matches.length - 1.
 *
 * `select` collapses the memo to `Accessor<number>` in a single reactive
 * dependency — no wrapping createMemo needed.
 *
 * Heuristic note: the depth returned is the TOTAL number of currently active
 * matches minus 1. This equals the nesting level of the deepest rendered
 * Outlet, which is what Shell.Matrix needs. If called from a layout component
 * at an intermediate level, the value will still reflect the deepest match
 * (i.e. TanStack loads all matching routes up-front). For per-layout depth
 * precision a <CapsuleOutlet> wrapper with an incrementing context would be
 * needed — deferred per task spec.
 */
export const useRouteDepth = (): Accessor<number> =>
  useMatches({ select: (matches) => Math.max(0, matches.length - 1) });
