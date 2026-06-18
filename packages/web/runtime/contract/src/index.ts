/**
 * @capsuletech/web-contract — leaf-протокол контрактов компонентов (zero-dep).
 *
 * Компонент КАРМАНИТ свой контракт через `defineContract(base, rules)`;
 * редакторы/стенд/тесты/доки ПОТРЕБЛЯЮТ через `collectContracts()`.
 * База (`name` + `kind`) обязательна — без неё окружение не воспринимает
 * сущность. Правила (`rule.*`) расширяют контракт под себя.
 *
 * Спека: docs/playground/contracts.md · роадмап: docs/playground/roadmap.md (F0).
 */
export { collectContracts } from './collect';
export { defineContract, isContract } from './define-contract';
export { propsSchemaOf } from './derive';
export { rule } from './rules';

export type { ContractCarrier, ContractSource } from './collect';
export type {
  Contract,
  ContractBase,
  ContractSurface,
  EntityKind,
  Example,
  Rule,
  RuleContext,
  SchemaLike,
  Severity,
  Violation,
} from './types';

export type { IEditorNode, IInteraction, ISchema, NodeId } from './schema';
