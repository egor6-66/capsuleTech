import { isContract } from './define-contract';
import type { Contract } from './types';

/** Носитель контракта: сам контракт, объект с полем `.contract`, либо ничего. */
export type ContractCarrier = Contract | { contract?: Contract } | null | undefined;

/** Источник контрактов: список, реестр по ключу, либо одиночный носитель. */
export type ContractSource =
  | Iterable<ContractCarrier>
  | Record<string, ContractCarrier>
  | ContractCarrier;

/**
 * «Перцепция» окружения: возвращает только сущности с валидной базой
 * (`name` + бренд контракта). Всё без контракта окружение не воспринимает —
 * так third-party компоненты/либы попадают в палитру лишь после `defineContract`.
 *
 * Принимает массив, реестр-объект (`{ 'ui.Button': ButtonContract }`) или
 * одиночный носитель.
 */
export function collectContracts(source: ContractSource): Contract[] {
  const carriers = toCarriers(source);
  const out: Contract[] = [];
  for (const c of carriers) {
    const contract = resolve(c);
    if (contract?.name) out.push(contract);
  }
  return out;
}

function resolve(carrier: ContractCarrier): Contract | null {
  if (isContract(carrier)) return carrier;
  const nested = (carrier as { contract?: Contract } | null | undefined)?.contract;
  return isContract(nested) ? nested : null;
}

function toCarriers(source: ContractSource): ContractCarrier[] {
  if (source == null) return [];
  if (isContract(source)) return [source];
  if (isIterable(source)) return Array.from(source);
  return Object.values(source);
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return value != null && typeof (value as Record<symbol, unknown>)[Symbol.iterator] === 'function';
}
