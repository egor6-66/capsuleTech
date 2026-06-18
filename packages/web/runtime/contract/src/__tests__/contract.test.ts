import { describe, expect, it } from 'vitest';
import { collectContracts, defineContract, isContract, propsSchemaOf, rule } from '../index';
import type { SchemaLike } from '../types';

/** Минимальный zod-стаб (leaf zero-dep, тесту настоящий zod не нужен). */
function enumSchema(values: string[]): SchemaLike {
  return {
    safeParse(value) {
      const v = (value as Record<string, unknown>)?.variant;
      return { success: v == null || values.includes(v as string) };
    },
  };
}

describe('defineContract — база обязательна', () => {
  it('минимальный контракт (без правил) уже воспринимается окружением', () => {
    const c = defineContract({ name: 'ForeignButton', kind: 'primitive' });
    expect(isContract(c)).toBe(true);
    expect(c.name).toBe('ForeignButton');
    expect(c.kind).toBe('primitive');
    expect(c.surface).toEqual({});
    expect(c.rules).toEqual([]);
  });

  it('правила докидывают facets в surface', () => {
    const c = defineContract({ name: 'X', kind: 'primitive' }, [
      rule.isLeaf(),
      rule.variants(['a', 'b']),
      rule.styleSlots(['root']),
    ]);
    expect(c.surface.isLeaf).toBe(true);
    expect(c.surface.variants).toEqual(['a', 'b']);
    expect(c.surface.styleSlots).toEqual(['root']);
  });
});

describe('срез: Button (primitive — props/variants/recommend)', () => {
  const ButtonContract = defineContract({ name: 'Button', kind: 'primitive' }, [
    rule.isLeaf(),
    rule.props(enumSchema(['default', 'ghost', 'outline'])),
    rule.variants(['default', 'ghost', 'outline']),
    rule.styleSlots(['root']),
    rule.recommend((ctx) => ctx.hasLabel !== true, 'Кнопке желателен лейбл'),
    rule.examples([{ name: 'default', props: { variant: 'default' } }]),
  ]);

  it('валидные props без детей — без нарушений (кроме recommend по лейблу)', () => {
    const v = ButtonContract.validate({ props: { variant: 'ghost' }, hasLabel: true });
    expect(v).toEqual([]);
  });

  it('неизвестный variant — constraint-нарушение', () => {
    const v = ButtonContract.validate({ props: { variant: 'neon' }, hasLabel: true });
    expect(v.some((x) => x.ruleId === 'variants' && x.severity === 'constraint')).toBe(true);
  });

  it('лист с детьми — constraint-нарушение', () => {
    const v = ButtonContract.validate({ children: [{ name: 'Card' }], hasLabel: true });
    expect(v.some((x) => x.ruleId === 'isLeaf' && x.severity === 'constraint')).toBe(true);
  });

  it('нет лейбла — мягкая рекомендация', () => {
    const v = ButtonContract.validate({ props: { variant: 'default' } });
    expect(v.some((x) => x.ruleId === 'recommend' && x.severity === 'recommendation')).toBe(true);
  });

  it('examples доступны стенду через surface', () => {
    expect(ButtonContract.surface.examples).toHaveLength(1);
  });
});

describe('срез: Card (composition — accepts, parent-side вложенность)', () => {
  const CardContract = defineContract({ name: 'Card', kind: 'composition' }, [
    rule.accepts(['Card.Header', 'Card.Content', 'Card.Footer']),
    rule.styleSlots(['root', 'header', 'content', 'footer']),
  ]);

  it('допустимые потомки — без нарушений', () => {
    const v = CardContract.validate({
      children: [{ name: 'Card.Header' }, { name: 'Card.Content' }],
    });
    expect(v).toEqual([]);
  });

  it('недопустимый потомок — constraint-нарушение', () => {
    const v = CardContract.validate({ children: [{ name: 'Button', kind: 'primitive' }] });
    expect(v.some((x) => x.ruleId === 'accepts' && x.severity === 'constraint')).toBe(true);
  });

  it('accepts матчит по kind, не только по name', () => {
    const Box = defineContract({ name: 'Box', kind: 'composition' }, [rule.accepts(['primitive'])]);
    expect(Box.validate({ children: [{ name: 'Button', kind: 'primitive' }] })).toEqual([]);
  });
});

describe('срез: DataTable (widget — data/events декларативно)', () => {
  const dataShape: SchemaLike = { safeParse: () => ({ success: true }) };
  const DataTableContract = defineContract({ name: 'DataTable', kind: 'widget' }, [
    rule.data(dataShape),
    rule.events(['onRowClick', 'onSort', 'onSelect']),
    rule.props({ safeParse: () => ({ success: true }) }),
  ]);

  it('data/events доступны через surface, без валидации', () => {
    expect(DataTableContract.surface.data).toBe(dataShape);
    expect(DataTableContract.surface.events).toEqual(['onRowClick', 'onSort', 'onSelect']);
    expect(DataTableContract.kind).toBe('widget');
  });
});

describe('propsSchemaOf — деривация props-схемы из контракта', () => {
  const schema: SchemaLike = {
    safeParse(value) {
      const v = (value as Record<string, unknown>)?.variant;
      return { success: v == null || v === 'default' };
    },
  };

  it('возвращает ту же reference что была передана в rule.props', () => {
    const c = defineContract({ name: 'X', kind: 'primitive' }, [rule.props(schema)]);
    expect(propsSchemaOf(c)).toBe(schema);
  });

  it('safeParse работает на извлечённой схеме', () => {
    const c = defineContract({ name: 'Y', kind: 'primitive' }, [rule.props(schema)]);
    const extracted = propsSchemaOf(c);
    expect(extracted?.safeParse({ variant: 'default' }).success).toBe(true);
    expect(extracted?.safeParse({ variant: 'neon' }).success).toBe(false);
  });

  it('возвращает undefined если rule.props не применялся', () => {
    const c = defineContract({ name: 'Z', kind: 'primitive' }, [rule.isLeaf()]);
    expect(propsSchemaOf(c)).toBeUndefined();
  });

  it('возвращает undefined для контракта без правил', () => {
    const c = defineContract({ name: 'Empty', kind: 'primitive' });
    expect(propsSchemaOf(c)).toBeUndefined();
  });
});

describe('collectContracts — перцепция окружения', () => {
  const Button = defineContract({ name: 'Button', kind: 'primitive' });
  const Card = defineContract({ name: 'Card', kind: 'composition' });

  it('массив контрактов', () => {
    expect(collectContracts([Button, Card]).map((c) => c.name)).toEqual(['Button', 'Card']);
  });

  it('реестр-объект по ключу', () => {
    const got = collectContracts({ 'ui.Button': Button, 'ui.Card': Card });
    expect(got).toHaveLength(2);
  });

  it('носители с полем .contract', () => {
    const got = collectContracts([{ contract: Button }, { contract: Card }]);
    expect(got.map((c) => c.name)).toEqual(['Button', 'Card']);
  });

  it('сущности без контракта окружение не воспринимает', () => {
    const got = collectContracts([Button, null, undefined, { foo: 1 } as never]);
    expect(got.map((c) => c.name)).toEqual(['Button']);
  });

  it('одиночный носитель', () => {
    expect(collectContracts(Button).map((c) => c.name)).toEqual(['Button']);
  });
});
