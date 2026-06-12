import type { Contract, ContractBase, ContractSurface, Rule, RuleContext, Violation } from './types';

/** Непубличный бренд — `isContract` отличает контракт от произвольного объекта. */
const CONTRACT_BRAND = Symbol.for('capsule.contract');

/**
 * Собирает контракт из обязательной базы и (опц.) набора правил.
 *
 * База (`name` + `kind`) — ядро, без которого окружение не воспринимает
 * сущность. Правила докидывают декларативные facets в `surface` и/или
 * валидацию в `validate`.
 *
 * @example
 * // минимальный — окружение уже «видит» сущность
 * const ForeignBtn = defineContract({ name: 'ForeignButton', kind: 'primitive' });
 *
 * // расширенный
 * const ButtonContract = defineContract(
 *   { name: 'Button', kind: 'primitive' },
 *   [rule.props(schema), rule.variants(['default', 'ghost'])],
 * );
 */
export function defineContract(base: ContractBase, rules: readonly Rule[] = []): Contract {
  const surface: ContractSurface = {};
  for (const r of rules) {
    if (r.facet) Object.assign(surface, r.facet);
  }

  const contract: Contract = {
    name: base.name,
    kind: base.kind,
    surface,
    rules,
    validate(ctx: RuleContext): Violation[] {
      const out: Violation[] = [];
      for (const r of rules) {
        const v = r.check?.(ctx);
        if (v) out.push(v);
      }
      return out;
    },
  };

  Object.defineProperty(contract, CONTRACT_BRAND, { value: true, enumerable: false });
  return contract;
}

/** Является ли значение контрактом (по бренду). */
export function isContract(value: unknown): value is Contract {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[CONTRACT_BRAND] === true
  );
}
