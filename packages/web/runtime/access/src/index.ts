/**
 * @capsuletech/web-access — единая gate-ось capsule (A0).
 *
 * capability — универсальная валюта; резолвер `can(cap)` + провайдеры
 * (authn/role/entitlement/flag). Enforcement в точках: nav-filter / element /
 * route-guard / build-inject. См. docs/playground/access.md.
 *
 * A0 (текущее): резолвер + RBAC role-провайдер (читает useAuth().role + policy)
 * + usePermissions/<Can>/filterAllowed. entitlement/flag/route-guard — далее.
 */

export { Can } from './Can';
export { roleProvider } from './providers/role';
export {
  __resetAccess,
  can,
  filterAllowed,
  registerAccessProvider,
  usePermissions,
} from './resolver';
export { setupAccess } from './setup';
export type { AccessPolicy, Capability, IAccessProvider, ICanProps } from './types';
