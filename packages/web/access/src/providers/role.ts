/**
 * RBAC-провайдер: грант, если `cap ∈ policy[role]`.
 *
 * Роль реактивна (читается из инжектированного `IAuthCapability`).
 * policy = app `access.json` (роль → capabilities). Auth не знает про
 * app-права — policy остаётся в аппе.
 *
 * **Cross-zone canon (ADR 047 D2):** этот provider потребляет роль через
 * leaf-контракт `IAuthCapability` (`@capsuletech/web-contract/capabilities`),
 * а НЕ через прямой import из `@capsuletech/web-auth`. Это разворачивает
 * direction: runtime пакет (web-access) не зависит на domain (web-auth);
 * domain реализует контракт, app wires через `setupAccess`.
 */

import type { IAuthCapability } from '@capsuletech/web-contract/capabilities';
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

/**
 * Создаёт RBAC role-provider.
 *
 * @param policy   карта роль → capabilities (app `access.json`).
 * @param auth     реализация `IAuthCapability` — обычно `useAuth()` из
 *                 `@capsuletech/web-auth/session` (см. ADR 047 D2 wiring
 *                 пример в `setupAccess`).
 */
export const roleProvider = (policy: AccessPolicy, auth: IAuthCapability): IAccessProvider => ({
  can(cap) {
    const role = auth.role;
    if (!role) return false;
    const grants = policy[role];
    if (!grants) return false;
    return matches(grants, cap);
  },
});
