import type { Dictionary } from './types';

/**
 * Authoring shape: a copy tree where leaves are strings and branches are
 * nested objects. Convenient to write by hand; flattened before storage.
 */
export interface NestedDictionary {
  [segment: string]: string | NestedDictionary;
}

/**
 * Flatten a nested copy tree into the flat dotted-key dictionary the registry
 * stores. Lets authors write `{ login: { email: { label } } }` while the engine
 * keeps O(1) lookup + shallow tenant overrides.
 *
 * ```ts
 * flatten({ login: { title: 'Sign in', email: { label: 'Email' } } })
 * // → { 'login.title': 'Sign in', 'login.email.label': 'Email' }
 * ```
 *
 * Leaves are strings; any plain-object value is recursed. The `prefix` arg is
 * internal (recursion) — callers pass only the tree.
 */
export function flatten(tree: NestedDictionary, prefix = ''): Dictionary {
  const out: Dictionary = {};
  for (const [segment, value] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${segment}` : segment;
    if (typeof value === 'string') {
      out[key] = value;
    } else {
      Object.assign(out, flatten(value, key));
    }
  }
  return out;
}
