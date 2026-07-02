/**
 * Коэрция значения text-поля на выходе инспектора (флаг `ITextField.coerce`).
 *
 * Regex строгий — только ЗАКОНЧЕННОЕ число: промежуточный ввод (`'1.'`, `'-'`)
 * остаётся строкой, иначе controlled-input срезал бы хвост при наборе десятичных
 * (`'1.'` → 1 → инпут показывает `'1'` — точка теряется).
 */

import type { ITextField } from '../types';

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

export const coerceTextValue = (field: ITextField, v: string): string | number =>
  field.coerce === 'number' && NUMERIC_RE.test(v) ? Number(v) : v;
