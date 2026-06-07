/**
 * wrapper.test.ts — характеризационные тесты Entity wrapper (domain data layer).
 *
 * Entity — plain config factory. Не компонент, не Solid-wrapper.
 * Factory вызывается на module-load time БЕЗ аргументов, результат — frozen plain object.
 * Zod-схема строится через глобал Zod (или напрямую через import { z } from 'zod' в тестах).
 *
 * Покрытие:
 *  1. Возвращает объект с полем `schema`
 *  2. `schema` — правильная zod-схема (можно вызвать .parse)
 *  3. `defaults` опциональны — Entity без defaults валиден
 *  4. `defaults` присутствуют когда переданы
 *  5. factory не получает аргументов (hard-switch: нет z-параметра)
 *  6. Результат совпадает ровно с тем, что вернула factory (прозрачный wrapper)
 *  7. Возвращённый объект заморожен (Object.isFrozen)
 *  8. Несколько Entity независимы (разные объекты)
 *  9. z.array + z.object — полный типичный кейс
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
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string() })),
    }));

    expect(Users).toHaveProperty('schema');
  });

  it('schema is a valid zod schema (parse succeeds)', () => {
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string(), name: z.string() })),
    }));

    const result = Users.schema.parse([{ id: '1', name: 'Alice' }]);
    expect(result).toEqual([{ id: '1', name: 'Alice' }]);
  });

  it('schema rejects invalid data (zod parse throws)', () => {
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string() })),
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
      Entity(() => ({
        schema: z.array(z.object({ id: z.string() })),
      })),
    ).not.toThrow();
  });

  it('defaults are undefined when not provided', () => {
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string() })),
    }));

    // Тип Entity без defaults не имеет поля `defaults` — это корректно.
    // Рантайм: обращение к отсутствующему полю frozen object → undefined.
    expect((Users as any).defaults).toBeUndefined();
  });

  it('defaults are present when provided', () => {
    const sample = [{ id: '1', name: 'Alice', amount: 100 }];

    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string(), name: z.string(), amount: z.number() })),
      defaults: sample,
    }));

    expect(Users.defaults).toEqual(sample);
  });
});

// ---------------------------------------------------------------------------
// 3. factory не принимает аргументов (hard-switch)
// ---------------------------------------------------------------------------

describe('Entity — factory has no arguments', () => {
  it('factory receives no arguments (z is not injected)', () => {
    let receivedArgs: unknown[] = [];

    Entity((...args: unknown[]) => {
      receivedArgs = args;
      return { schema: z.array(z.string()) };
    });

    expect(receivedArgs).toHaveLength(0);
  });

  it('z.string() usable via direct import (not via factory arg)', () => {
    const Tags = Entity(() => ({
      schema: z.array(z.string()),
      defaults: ['alpha', 'beta'],
    }));

    expect(Tags.schema.parse(['x', 'y'])).toEqual(['x', 'y']);
  });

  it('z.number() usable via direct import', () => {
    const Prices = Entity(() => ({
      schema: z.array(z.number()),
      defaults: [1.5, 2.0],
    }));

    expect(Prices.schema.parse([10, 20])).toEqual([10, 20]);
  });

  it('z.object() usable via direct import', () => {
    const Orders = Entity(() => ({
      schema: z.object({ id: z.string(), total: z.number() }),
    }));

    const parsed = Orders.schema.parse({ id: 'o1', total: 99.9 });
    expect(parsed).toEqual({ id: 'o1', total: 99.9 });
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
      () =>
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
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string() })),
    }));

    expect(Object.isFrozen(Users)).toBe(true);
  });

  it('mutating frozen object throws in strict mode (or silently fails)', () => {
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string() })),
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
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string() })),
    }));

    const Products = Entity(() => ({
      schema: z.array(z.object({ sku: z.string(), price: z.number() })),
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
    const Users = Entity(() => ({
      schema: z.array(z.object({ id: z.string(), name: z.string() })),
      defaults: [{ id: '1', name: 'Alice' }],
    }));

    type InferredItem = (typeof Users.defaults)[number];
    expectTypeOf<InferredItem>().toMatchTypeOf<{ id: string; name: string }>();
  });

  it('Entity without defaults: result type has no defaults field (correct narrowing)', () => {
    const Tags = Entity(() => ({
      schema: z.array(z.string()),
    }));

    // Когда factory не возвращает defaults — тип сужается до `{ schema: ... }` без defaults.
    // Это корректное поведение generic T (exact return inference).
    // Проверяем что schema присутствует и правильно типизирована.
    expectTypeOf(Tags.schema).not.toBeUndefined();
    // Рантайм: обращение к отсутствующему полю → undefined.
    expect((Tags as any).defaults).toBeUndefined();
  });

  it('factory type is () => T — no z parameter in IEntityFactory', () => {
    // Проверяем что IEntityFactory не принимает аргументов.
    // Если factory ожидает z — TS-error здесь (compile-time check).
    const factory: import('../types').IEntityFactory<{ schema: ReturnType<typeof z.string> }> =
      () => ({ schema: z.string() });
    expect(factory).toBeTypeOf('function');
    // factory() вызывается без аргументов
    expect(factory()).toHaveProperty('schema');
  });
});
