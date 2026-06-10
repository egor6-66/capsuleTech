/**
 * access-resolver.ts
 *
 * Generic access-enforcement seam in web-core.
 *
 * Design constraints:
 *  - web-core MUST NOT depend on @capsuletech/web-access (cycle risk).
 *  - The resolver is INJECTED by the downstream access package on its init path,
 *    never imported from it here.
 *  - If no resolver is registered (or null is passed to clear it), every
 *    capability check returns `true` — fully backward-compatible, zero behaviour
 *    change for apps that don't use access-gating.
 *  - The resolver itself is expected to read reactive state internally
 *    (e.g. `useAuth().role` from web-auth). web-core calls the resolver
 *    INSIDE reactive scopes (Shape filter memo, UiProxy render); it must NOT
 *    memoize the returned boolean in a way that defeats that reactivity.
 *
 * Usage by web-access (on package init):
 * ```ts
 * import { registerAccessResolver } from '@capsuletech/web-core';
 *
 * registerAccessResolver((cap) => {
 *   const { role } = useAuth();           // reactive read
 *   return policy[role]?.includes(cap) ?? false;
 * });
 * ```
 *
 * Usage at enforcement points (internal, inside reactive scope):
 * ```ts
 * import { resolveAccess } from '../engine/access-resolver';
 *
 * // returns true when no resolver is registered (allow-all default)
 * const allowed = resolveAccess('workspace.builds');
 * ```
 */

/** Type of the injected capability resolver. */
export type AccessResolver = (capability: string) => boolean;

/** Module-level slot. `null` means no resolver registered → allow all. */
let _resolver: AccessResolver | null = null;

/**
 * Registers (or clears) the global capability resolver.
 *
 * Called by @capsuletech/web-access (or any package) during its
 * initialisation — before any Component mounts that may gate on `can`.
 *
 * Passing `null` clears an existing resolver (useful in tests / SSR teardown).
 *
 * This function is exported from the main barrel so downstream packages
 * can call it without needing a subpath import.
 *
 * @param resolver  `(cap: string) => boolean` reactive function, or `null` to clear.
 */
export const registerAccessResolver = (resolver: AccessResolver | null): void => {
  _resolver = resolver;
};

/**
 * Evaluates a capability against the registered resolver.
 *
 * Must be called **inside a Solid reactive scope** (e.g. inside a render
 * function, `createEffect`, or `createMemo`) so that reactive reads inside
 * the resolver propagate to the calling scope.
 *
 * @param capability  Capability string (e.g. `'builds'`, `'workspace.builds'`).
 *                    Passing `undefined` / empty string → always allowed.
 * @returns `true` if allowed or no resolver is registered; `false` if denied.
 */
export const resolveAccess = (capability: string | undefined): boolean => {
  if (!capability) return true;
  if (!_resolver) return true;
  return _resolver(capability);
};

/**
 * Returns `true` if a resolver has been registered.
 * Used by enforcement points to skip the call entirely when access-gating
 * is not configured — avoids any overhead in the common case.
 */
export const hasAccessResolver = (): boolean => _resolver !== null;
