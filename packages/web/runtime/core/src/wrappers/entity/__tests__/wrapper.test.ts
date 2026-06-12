/**
 * wrapper.test.ts — характеризационные тесты Entity wrapper (domain data layer).
 *
 * Entity — plain config factory. Не компонент, не Solid-wrapper.
 * Factory вызывается на module-load time с объектом `{ zod }`, результат — frozen plain object.
 * Zod-схема строится через инжектированный `zod` (или напрямую через import { z } from 'zod' в тестах).
 *
 * Покрытие:
 *  1. Возвращает объект с полем `schema`
 *  2. `schema` — правильная zod-схема (можно вызвать .parse)
 *  3. `defaults` опциональны — Entity без defaults валиден
 *  4. `defaults` присутствуют когда переданы
 *  5. factory получает объект { zod } — инжектированный инструмент
 *  6. Результат совпадает ровно с тем, что вернула factory (прозрачный wrapper)
 *  7. Возвращённый объект заморожен (Object.isFrozen)
 *  8. Несколько Entity независимы (разные объекты)
 *  9. zod.array + zod.object — полный типичный кейс через инжект
 * 10. `defaults` типизированы под схему (type-level, проверяем через expectTypeOf)
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { Entity } from '../wrapper';

// ---------------------------------------------------------------------------
// 1. Возвращает объект с полем `schema`
// ---------------------------------------------------------------------------

describe('Entity — schema field', () => {
  it('returns an object with a schema property', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string() })),
    }));

    expect(Users).toHaveProperty('schema');
  });

  it('schema is a valid zod schema (parse succeeds)', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string(), name: zod.string() })),
    }));

    const result = Users.schema.parse([{ id: '1', name: 'Alice' }]);
    expect(result).toEqual([{ id: '1', name: 'Alice' }]);
  });

  it('schema rejects invalid data (zod parse throws)', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string() })),
    }));

    expect(() => Users.schema.parse([{ id: 42 }])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. defaults — опциональны
// ---------------------------------------------------------------------------

describe('Entity — defaults are optional', () => {
  it('Entity without defaults is valid (no error)', () => {
    expect(() =>
      Entity(({ zod }) => ({
        schema: zod.array(zod.object({ id: zod.string() })),
      })),
    ).not.toThrow();
  });

  it('defaults are undefined when not provided', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string() })),
    }));

    // Тип Entity без defaults не имеет поля `defaults` — это корректно.
    // Рантайм: обращение к отсутствующему полю frozen object → undefined.
    expect((Users as any).defaults).toBeUndefined();
  });

  it('defaults are present when provided', () => {
    const sample = [{ id: '1', name: 'Alice', amount: 100 }];

    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string(), name: zod.string(), amount: zod.number() })),
      defaults: sample,
    }));

    expect(Users.defaults).toEqual(sample);
  });
});

// ---------------------------------------------------------------------------
// 3. factory получает объект { zod } — инжектированный инструмент
// ---------------------------------------------------------------------------

describe('Entity — factory receives { zod } tools', () => {
  it('factory receives exactly one argument — the tools object', () => {
    let receivedArgs: unknown[] = [];

    Entity((...args: unknown[]) => {
      receivedArgs = args;
      return { schema: z.array(z.string()) };
    });

    expect(receivedArgs).toHaveLength(1);
  });

  it('factory receives tools object with zod property', () => {
    let receivedTools: unknown;

    Entity((tools) => {
      receivedTools = tools;
      return { schema: z.array(z.string()) };
    });

    expect(receivedTools).toBeDefined();
    expect(typeof (receivedTools as any)?.zod).toBe('object');
  });

  it('injected zod.string() works correctly', () => {
    const Tags = Entity(({ zod }) => ({
      schema: zod.array(zod.string()),
      defaults: ['alpha', 'beta'],
    }));

    expect(Tags.schema.parse(['x', 'y'])).toEqual(['x', 'y']);
  });

  it('injected zod.number() works correctly', () => {
    const Prices = Entity(({ zod }) => ({
      schema: zod.array(zod.number()),
      defaults: [1.5, 2.0],
    }));

    expect(Prices.schema.parse([10, 20])).toEqual([10, 20]);
  });

  it('injected zod.object() works correctly', () => {
    const Orders = Entity(({ zod }) => ({
      schema: zod.object({ id: zod.string(), total: zod.number() }),
    }));

    const parsed = Orders.schema.parse({ id: 'o1', total: 99.9 });
    expect(parsed).toEqual({ id: 'o1', total: 99.9 });
  });

  it('injected zod is the same reference as Zod from shared-zod', async () => {
    const { Zod: ZodRef } = await import('@capsuletech/shared-zod');
    let receivedZod: unknown;

    Entity((tools) => {
      receivedZod = tools.zod;
      return { schema: z.array(z.string()) };
    });

    expect(receivedZod).toBe(ZodRef);
  });
});

// ---------------------------------------------------------------------------
// 4. Прозрачный wrapper — результат === то что вернула factory
// ---------------------------------------------------------------------------

describe('Entity — transparent wrapper', () => {
  it('result has exactly the same keys as factory return', () => {
    const schema = z.array(z.string());
    const defaults = ['a'];

    const MyEntity = Entity(() => ({ schema, defaults }));

    expect(MyEntity.schema).toBe(schema);
    expect(MyEntity.defaults).toBe(defaults);
  });

  it('extra fields from factory are preserved', () => {
    const MyEntity = Entity(
      (_tools) =>
        ({
          schema: z.array(z.string()),
          // extra field beyond IEntityDefinition contract — still preserved
          label: 'My Entity',
        }) as any,
    );

    expect((MyEntity as any).label).toBe('My Entity');
  });
});

// ---------------------------------------------------------------------------
// 5. Результат заморожен
// ---------------------------------------------------------------------------

describe('Entity — result is frozen', () => {
  it('Object.isFrozen returns true', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string() })),
    }));

    expect(Object.isFrozen(Users)).toBe(true);
  });

  it('mutating frozen object throws in strict mode (or silently fails)', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string() })),
      defaults: [{ id: '1' }],
    }));

    // В strict mode (ESM всегда strict) — TypeError
    expect(() => {
      (Users as any).newProp = 'hack';
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. Несколько Entity независимы
// ---------------------------------------------------------------------------

describe('Entity — multiple instances are independent', () => {
  it('two Entity calls produce separate objects', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string() })),
    }));

    const Products = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ sku: zod.string(), price: zod.number() })),
    }));

    expect(Users).not.toBe(Products);
    expect(Users.schema).not.toBe(Products.schema);
  });
});

// ---------------------------------------------------------------------------
// 7. Type-level проверки через expectTypeOf
// ---------------------------------------------------------------------------

describe('Entity — type-level checks', () => {
  it('result schema type infers correctly', () => {
    const Users = Entity(({ zod }) => ({
      schema: zod.array(zod.object({ id: zod.string(), name: zod.string() })),
      defaults: [{ id: '1', name: 'Alice' }],
    }));

    type InferredItem = (typeof Users.defaults)[number];
    expectTypeOf<InferredItem>().toMatchTypeOf<{ id: string; name: string }>();
  });

  it('Entity without defaults: result type has no defaults field (correct narrowing)', () => {
    const Tags = Entity(({ zod }) => ({
      schema: zod.array(zod.string()),
    }));

    // Когда factory не возвращает defaults — тип сужается до `{ schema: ... }` без defaults.
    // Это корректное поведение generic T (exact return inference).
    // Проверяем что schema присутствует и правильно типизирована.
    expectTypeOf(Tags.schema).not.toBeUndefined();
    // Рантайм: обращение к отсутствующему полю → undefined.
    expect((Tags as any).defaults).toBeUndefined();
  });

  it('factory type is (tools: IEntityTools) => T — { zod } injected', () => {
    // Проверяем что IEntityFactory принимает tools с zod.
    // Если сигнатура не совпадает — TS-error здесь (compile-time check).
    const factory: import('../types').IEntityFactory<{ schema: ReturnType<typeof z.string> }> = ({
      zod,
    }) => ({ schema: zod.string() });
    expect(factory).toBeTypeOf('function');
    // factory вызывается с tools-объектом
    const { Zod: ZodRef } = require('@capsuletech/shared-zod');
    expect(factory({ zod: ZodRef })).toHaveProperty('schema');
  });
});
