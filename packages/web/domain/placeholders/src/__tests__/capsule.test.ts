/**
 * Манифест регистрации: имя `Placeholders` + курируемая поверхность из 6 блоков.
 * `Error` в глобале маппится на экспорт `ErrorState`.
 */
import { describe, expect, it } from 'vitest';
import module from '../capsule';

describe('@capsuletech/web-placeholders/capsule', () => {
  it('имя namespace — Placeholders (не JS-builtin)', () => {
    expect(module.name).toBe('Placeholders');
  });

  it('экспонирует все 6 блоков', () => {
    expect(Object.keys(module.components).sort()).toEqual([
      'AccessDenied',
      'Community',
      'Empty',
      'Error',
      'NotFound',
      'WidgetUnavailable',
    ]);
  });

  it('каждый компонент — функция-компонент', () => {
    for (const comp of Object.values(module.components)) {
      expect(typeof comp).toBe('function');
    }
  });
});
