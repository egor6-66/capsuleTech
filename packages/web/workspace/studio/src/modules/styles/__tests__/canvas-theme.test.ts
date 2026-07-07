import { afterEach, describe, expect, it } from 'vitest';
import { useCanvasTheme } from '../canvas-theme';

// Singleton — сбрасываем между тестами.
afterEach(() => {
  useCanvasTheme().reset();
});

describe('canvas-theme singleton', () => {
  it('по умолчанию оба override === undefined (наследовать host)', () => {
    const ct = useCanvasTheme();
    expect(ct.theme()).toBeUndefined();
    expect(ct.dark()).toBeUndefined();
  });

  it('setTheme/setDark пишут override', () => {
    const ct = useCanvasTheme();
    ct.setTheme('ocean');
    ct.setDark(true);
    expect(ct.theme()).toBe('ocean');
    expect(ct.dark()).toBe(true);
  });

  it('setDark(false) сохраняет явный режим (не undefined)', () => {
    const ct = useCanvasTheme();
    ct.setDark(false);
    expect(ct.dark()).toBe(false);
  });

  it('setTheme(undefined) возвращает к наследованию host', () => {
    const ct = useCanvasTheme();
    ct.setTheme('ocean');
    ct.setTheme(undefined);
    expect(ct.theme()).toBeUndefined();
  });

  it('reset() сбрасывает оба override в undefined', () => {
    const ct = useCanvasTheme();
    ct.setTheme('ocean');
    ct.setDark(true);
    ct.reset();
    expect(ct.theme()).toBeUndefined();
    expect(ct.dark()).toBeUndefined();
  });

  it('singleton общий — разные вызовы useCanvasTheme видят одно состояние', () => {
    useCanvasTheme().setTheme('forest');
    expect(useCanvasTheme().theme()).toBe('forest');
  });
});
