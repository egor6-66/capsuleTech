/**
 * Bootstrap-хелпер web-access.
 *
 * Регистрирует RBAC role-провайдер (policy + auth-capability) И мостит
 * резолвер `can` в web-core enforcement-sink (`registerAccessResolver`).
 * web-core остаётся access-agnostic — резолвер ИНЖЕКТИТСЯ, а не импортится.
 *
 * **Cross-zone canon (ADR 047 D2):** auth передаётся явно через
 * `IAuthCapability` контракт (`@capsuletech/web-contract/capabilities`),
 * НЕ через прямой import. App wires:
 *
 * ```ts
 * // apps/<app>/capsule.app.ts
 * import { setupAccess } from '@capsuletech/web-access';
 * import { useAuth } from '@capsuletech/web-auth/session';
 *
 * setupAccess(policy, useAuth());
 * ```
 *
 * Вызвать один раз на старте аппа. Промоут → декларативный `access:` в
 * defineAppConfig (генератор) — позже.
 */

import type { IAuthCapability } from '@capsuletech/web-contract/capabilities';
import { registerAccessResolver } from '@capsuletech/web-core';
import { roleProvider } from './providers/role';
import { can, registerAccessProvider } from './resolver';
import type { AccessPolicy } from './types';

export const setupAccess = (policy: AccessPolicy, auth: IAuthCapability): void => {
  registerAccessProvider(roleProvider(policy, auth));
  registerAccessResolver((cap) => can(cap));
};
