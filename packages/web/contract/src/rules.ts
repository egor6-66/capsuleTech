import type { Example, Rule, RuleContext, SchemaLike, Severity } from './types';

function violation(id: string, severity: Severity, message: string) {
  return { ruleId: id, severity, message };
}

/**
 * Rule-примитивы. Каждый возвращает {@link Rule}: декларативный `facet`
 * (мерджится в `contract.surface`) и/или `check` (валидация инстанса).
 * Компонент берёт нужные + докидывает свои тематические (из web-table и т.п.).
 */
export const rule = {
  /** Лист — не принимает детей. constraint: дети → нарушение. */
  isLeaf(): Rule {
    return {
      id: 'isLeaf',
      severity: 'constraint',
      facet: { isLeaf: true },
      check(ctx: RuleContext) {
        return ctx.children && ctx.children.length > 0
          ? violation('isLeaf', 'constraint', 'Компонент — лист: не принимает детей')
          : null;
      },
    };
  },

  /**
   * Какие типы детей допустимы (parent-side, single source вложенности).
   * Ребёнок матчится по `name` ИЛИ `kind`. constraint: чужой потомок → нарушение.
   */
  accepts(types: readonly string[]): Rule {
    return {
      id: 'accepts',
      severity: 'constraint',
      facet: { accepts: types },
      check(ctx: RuleContext) {
        for (const child of ctx.children ?? []) {
          const ok =
            (child.name != null && types.includes(child.name)) ||
            (child.kind != null && types.includes(child.kind));
          if (!ok) {
            return violation(
              'accepts',
              'constraint',
              `Недопустимый потомок: ${child.name ?? child.kind ?? '?'}`,
            );
          }
        }
        return null;
      },
    };
  },

  /** Схема props (zod-совместимая). constraint: невалидные props → нарушение. */
  props(schema: SchemaLike): Rule {
    return {
      id: 'props',
      severity: 'constraint',
      facet: { props: schema },
      check(ctx: RuleContext) {
        if (!ctx.props) return null;
        return schema.safeParse(ctx.props).success
          ? null
          : violation('props', 'constraint', 'Невалидные props');
      },
    };
  },

  /** Закрытый список вариантов. constraint: `props.variant` вне списка → нарушение. */
  variants(list: readonly string[]): Rule {
    return {
      id: 'variants',
      severity: 'constraint',
      facet: { variants: list },
      check(ctx: RuleContext) {
        const v = ctx.props?.variant;
        return v != null && !list.includes(v as string)
          ? violation('variants', 'constraint', `Неизвестный variant: ${String(v)}`)
          : null;
      },
    };
  },

  /** Темизируемые слоты — декларативно, без валидации. Их видит style-редактор. */
  styleSlots(list: readonly string[]): Rule {
    return { id: 'styleSlots', severity: 'recommendation', facet: { styleSlots: list } };
  },

  /** Data-bindable форма — декларативно. Её видит data-редактор. */
  data(shape: SchemaLike | Record<string, unknown>): Rule {
    return { id: 'data', severity: 'recommendation', facet: { data: shape } };
  },

  /** Трассируемые события — декларативно. Их видит монитор. */
  events(list: readonly string[]): Rule {
    return { id: 'events', severity: 'recommendation', facet: { events: list } };
  },

  /** Мягкая рекомендация: предикат истинен → варнинг с подсказкой. */
  recommend(predicate: (ctx: RuleContext) => boolean, hint: string): Rule {
    return {
      id: 'recommend',
      severity: 'recommendation',
      check(ctx: RuleContext) {
        return predicate(ctx) ? violation('recommend', 'recommendation', hint) : null;
      },
    };
  },

  /** Демо-кейсы для стенда — декларативно. Их рендерит catalog. */
  examples(list: readonly Example[]): Rule {
    return { id: 'examples', severity: 'recommendation', facet: { examples: list } };
  },
};
