import { describe, expect, it } from 'vitest';
import { coerceTextValue } from '../fields/coerce';
import type { ITextField } from '../types';

const coercing: ITextField = { key: 'cols', label: 'cols', type: 'text', coerce: 'number' };
const plain: ITextField = { key: 'class', label: 'class', type: 'text' };

describe('coerceTextValue', () => {
  it('числовая строка → number при coerce', () => {
    expect(coerceTextValue(coercing, '3')).toBe(3);
    expect(coerceTextValue(coercing, '-1.5')).toBe(-1.5);
  });

  it('CSS-строка остаётся строкой', () => {
    expect(coerceTextValue(coercing, 'repeat(auto-fill, minmax(120px, 1fr))')).toBe(
      'repeat(auto-fill, minmax(120px, 1fr))',
    );
    expect(coerceTextValue(coercing, '200px 1fr')).toBe('200px 1fr');
  });

  it('промежуточный ввод не коэрсится (controlled-input не режет хвост)', () => {
    expect(coerceTextValue(coercing, '1.')).toBe('1.');
    expect(coerceTextValue(coercing, '-')).toBe('-');
    expect(coerceTextValue(coercing, '')).toBe('');
  });

  it('без coerce-флага строка проходит как есть', () => {
    expect(coerceTextValue(plain, '3')).toBe('3');
  });
});
