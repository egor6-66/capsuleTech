/**
 * Контракт-реестр info-модуля — резолвит тип компонента
 * (`'ui.Button'` / `'ui.Card'`) в `Contract` из `@capsuletech/web-contract`.
 *
 * Сейчас только Button + Card — единственные компоненты kit'а с
 * `defineContract` (см. `*.contract.ts` рядом с компонентом). По мере того,
 * как owner-web-ui добавляет контракты другим primitives, мапа здесь
 * расширяется руками. Авто-collect через `collectContracts(kitExports)` —
 * следующая итерация, когда контрактов станет много.
 */

import { ButtonContract } from '@capsuletech/web-ui/button';
import { CardContract } from '@capsuletech/web-ui/card';
import type { Contract } from '@capsuletech/web-contract';

const CONTRACT_BY_TYPE: Record<string, Contract> = {
  'ui.Button': ButtonContract,
  'ui.Card': CardContract,
};

export const getContract = (type: string): Contract | undefined =>
  CONTRACT_BY_TYPE[type];

export const hasContract = (type: string): boolean => type in CONTRACT_BY_TYPE;
