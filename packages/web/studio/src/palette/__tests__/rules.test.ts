import { describe, expect, it } from 'vitest';
import { applyFieldRule, fieldRules } from '../rules';

describe('Field rules — ui.Button', () => {
  it('обычная Button — никаких hidden/disabled', () => {
    const r = applyFieldRule('ui.Button', { variant: 'default', children: 'X' });
    expect(r.hidden ?? []).toEqual([]);
    expect(r.disabled ?? []).toEqual([]);
  });

  it('size=icon → скрывает поле children', () => {
    const r = applyFieldRule('ui.Button', { size: 'icon', variant: 'ghost' });
    expect(r.hidden).toEqual(['children']);
  });

  it('неизвестный тип — пустой результат', () => {
    const r = applyFieldRule('ui.Unknown', { foo: 'bar' });
    expect(r.hidden ?? []).toEqual([]);
    expect(r.disabled ?? []).toEqual([]);
  });

  it('registry содержит ui.Button', () => {
    expect(fieldRules['ui.Button']).toBeDefined();
  });
});
