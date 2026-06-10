/**
 * RBAC-провайдер: грант, если `cap ∈ policy[useAuth().role]`.
 *
 * Роль реактивна (читается из web-auth `useAuth()`), поэтому `can()` реактивен
 * в tracking-scope. policy = app `access.json` (роль → capabilities).
 * Auth не знает про app-права — policy остаётся в аппе.
 */

import { useAuth } from '@capsuletech/web-auth/session';
import type { AccessPolicy, Capability, IAccessProvider } from '../types';

const matches = (grants: readonly Capability[], cap: Capability): boolean => {
  for (const g of grants) {
    if (g === '*') return true;
    if (g === cap) return true;
    // префикс-грант: 'workspace.*' покрывает 'workspace.builds'
    if (g.endsWith('.*') && cap.startsWith(g.slice(0, -1))) return true;
  }
  return false;
};

export const roleProvider = (policy: AccessPolicy): IAccessProvider => ({
  can(cap) {
    const role = useAuth().role;
    if (!role) return false;
    const grants = policy[role];
    if (!grants) return false;
    return matches(grants, cap);
  },
});
