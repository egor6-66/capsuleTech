/**
 * Bootstrap-хелпер web-access.
 *
 * Регистрирует RBAC role-провайдер (policy) И мостит резолвер `can` в
 * web-core enforcement-sink (`registerAccessResolver`). web-core остаётся
 * access-agnostic — резолвер ИНЖЕКТИТСЯ, а не импортится (нет цикла
 * web-core → web-access → web-auth → web-core).
 *
 * Вызвать один раз на старте аппа (side-effect в `capsule.app.ts`).
 * Промоут → декларативный `access:` в defineAppConfig (генератор) — позже.
 */

import { registerAccessResolver } from '@capsuletech/web-core';
import { roleProvider } from './providers/role';
import { can, registerAccessProvider } from './resolver';
import type { AccessPolicy } from './types';

export const setupAccess = (policy: AccessPolicy): void => {
  registerAccessProvider(roleProvider(policy));
  registerAccessResolver((cap) => can(cap));
};
