/**
 * module.test.ts — характеризационные тесты для `defineCapsuleModule` и
 * типа `IAppConfig.packages` (ADR 033, фаза 1).
 *
 * Покрытие:
 *  1. defineCapsuleModule — identity (runtime: возвращает тот же объект)
 *  2. defineCapsuleModule — сохраняет все поля (name, components, controllers)
 *  3. defineCapsuleModule — сохраняет литеральный type inference (type-level)
 *  4. defineCapsuleModule — controllers необязательны (минимальный манифест)
 *  5. IAppConfig.packages — принимает строки
 *  6. IAppConfig.packages — принимает объекты { use, as? }
 *  7. IAppConfig.packages — принимает смешанный массив (строки + объекты)
 *  8. IAppConfig.packages — поле опционально (без него IAppConfig валиден)
 *  9. Несколько вызовов defineCapsuleModule независимы
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineAppConfig, type IAppConfig } from '../app-config';
import { defineCapsuleModule, type ICapsuleModule } from '../module';

// ---------------------------------------------------------------------------
// 1–4: defineCapsuleModule — runtime
// ---------------------------------------------------------------------------

describe('defineCapsuleModule — identity', () => {
  it('returns the exact same object reference (identity function)', () => {
    const manifest = {
      name: 'Maps',
      components: { View: () => null },
    };

    const result = defineCapsuleModule(manifest);

    expect(result).toBe(manifest);
  });

  it('preserves name field', () => {
    const m = defineCapsuleModule({ name: 'Charts', components: {} });
    expect(m.name).toBe('Charts');
  });

  it('preserves components field', () => {
    const View = () => null;
    const Layer = () => null;
    const m = defineCapsuleModule({ name: 'Maps', components: { View, Layer } });

    expect(m.components.View).toBe(View);
    expect(m.components.Layer).toBe(Layer);
  });

  it('preserves optional controllers field when provided', () => {
    const MyController = {};
    const m = defineCapsuleModule({
      name: 'Maps',
      components: {},
      controllers: { Editor: MyController },
    });

    expect(m.controllers?.Editor).toBe(MyController);
  });

  it('controllers is undefined when not provided (minimal manifest)', () => {
    // cast to ICapsuleModule to access optional field at type-level
    const m: ICapsuleModule = defineCapsuleModule({ name: 'Maps', components: {} });
    expect(m.controllers).toBeUndefined();
  });

  it('two defineCapsuleModule calls produce independent objects', () => {
    const m1 = defineCapsuleModule({ name: 'Maps', components: { View: () => null } });
    const m2 = defineCapsuleModule({ name: 'Charts', components: { Line: () => null } });

    expect(m1).not.toBe(m2);
    expect(m1.name).not.toBe(m2.name);
  });
});

// ---------------------------------------------------------------------------
// Type-level: defineCapsuleModule preserves literal inference
// ---------------------------------------------------------------------------

describe('defineCapsuleModule — type-level', () => {
  it('result satisfies ICapsuleModule', () => {
    const m = defineCapsuleModule({ name: 'Maps', components: {} });
    expectTypeOf(m).toMatchTypeOf<ICapsuleModule>();
  });

  it('result name type is string (not narrowed to literal by default)', () => {
    const m = defineCapsuleModule({ name: 'Maps', components: {} });
    expectTypeOf(m.name).toBeString();
  });

  it('result components type matches provided shape', () => {
    const View = (_props: { style?: string }) => null;
    const m = defineCapsuleModule({ name: 'Maps', components: { View } });

    // components.View присутствует в типе
    expectTypeOf(m.components).toHaveProperty('View');
  });

  it('ICapsuleModule — name is required string', () => {
    expectTypeOf<ICapsuleModule['name']>().toBeString();
  });

  it('ICapsuleModule — components is required record', () => {
    // Не undefined
    expectTypeOf<ICapsuleModule['components']>().not.toBeUndefined();
  });

  it('ICapsuleModule — controllers is optional (can be undefined)', () => {
    type C = ICapsuleModule['controllers'];
    // controllers is optional → its type includes undefined
    type _checkOptional = undefined extends C ? true : false;
    // static assertion: undefined must extend C
    const _assertOptional: _checkOptional = true;
    expect(_assertOptional).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// IAppConfig.packages — type-level проверки
// ---------------------------------------------------------------------------

describe('IAppConfig.packages — type-level', () => {
  it('packages is optional — IAppConfig without it is valid', () => {
    const config: IAppConfig = {};
    expectTypeOf(config).toMatchTypeOf<IAppConfig>();
  });

  it('packages accepts an array of strings', () => {
    const config: IAppConfig = {
      packages: ['@capsuletech/web-map', '@capsuletech/web-charts'],
    };
    expectTypeOf(config).toMatchTypeOf<IAppConfig>();
  });

  it('packages accepts an array of { use, as? } objects', () => {
    const config: IAppConfig = {
      packages: [
        { use: '@capsuletech/web-renderer', as: 'Render' },
        { use: '@capsuletech/web-map' }, // as is optional
      ],
    };
    expectTypeOf(config).toMatchTypeOf<IAppConfig>();
  });

  it('packages accepts mixed array (strings + objects)', () => {
    const config: IAppConfig = {
      packages: ['@capsuletech/web-map', { use: '@capsuletech/web-renderer', as: 'Render' }],
    };
    expectTypeOf(config).toMatchTypeOf<IAppConfig>();
  });

  it('IAppConfig.packages element type: string | { use: string; as?: string }', () => {
    type Element = NonNullable<IAppConfig['packages']>[number];
    expectTypeOf<Element>().toEqualTypeOf<string | { use: string; as?: string }>();
  });
});

// ---------------------------------------------------------------------------
// defineAppConfig — smoke-check: packages field goes through
// ---------------------------------------------------------------------------

describe('defineAppConfig — packages field', () => {
  it('defineAppConfig returns config with packages field', () => {
    const config = defineAppConfig({
      packages: ['@capsuletech/web-map'],
    });

    expect(config.packages).toEqual(['@capsuletech/web-map']);
  });

  it('defineAppConfig with mixed packages preserves structure', () => {
    const config = defineAppConfig({
      packages: ['@capsuletech/web-map', { use: '@capsuletech/web-renderer', as: 'Render' }],
    });

    expect(config.packages).toHaveLength(2);
    expect(config.packages?.[0]).toBe('@capsuletech/web-map');
    expect(config.packages?.[1]).toEqual({ use: '@capsuletech/web-renderer', as: 'Render' });
  });
});
