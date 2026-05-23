import type { ZodTypeAny } from '@capsuletech/shared-zod';
import { coin, pick, randomInt, type Rng } from './rng';

/**
 * Заполняет props на основе zod-схемы манифеста и его defaults. Для каждого
 * поля: если есть override — берёт override; иначе генерит через random по
 * типу схемы; иначе оставляет default.
 *
 * Поддерживаемые типы:
 *   - z.enum([...])  → pick random из values
 *   - z.boolean()    → coin (50/50)
 *   - z.number()     → randomInt(0..100)
 *   - z.string()     → default (если есть .default()) либо ''
 *   - z.optional(X)  → 50% шанс пропустить, 50% шанс fuzz
 *   - z.default(X,d) → используется default `d` если fuzz не сработал
 *
 * Schema introspection через `_def.typeName` — стабильно работает даже при
 * нескольких копиях zod в монорепе (instanceof мог бы сломаться).
 */
export const fuzzProps = (
  rng: Rng,
  propsSchema: ZodTypeAny,
  defaults: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
  const shape = getShape(propsSchema);
  // Не object — возвращаем defaults + overrides (нечего fuzz'ить).
  if (!shape) return { ...defaults, ...overrides };

  const result: Record<string, unknown> = { ...defaults };
  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (key in overrides) {
      result[key] = overrides[key];
      continue;
    }
    const value = fuzzField(rng, fieldSchema, defaults[key]);
    if (value === undefined) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
};

const getShape = (schema: ZodTypeAny): Record<string, ZodTypeAny> | null => {
  const def = getDef(schema);
  if (def?.typeName !== 'ZodObject') return null;
  const shape = typeof def.shape === 'function' ? def.shape() : def.shape;
  return shape as Record<string, ZodTypeAny>;
};

interface IZodDef {
  typeName: string;
  innerType?: ZodTypeAny;
  values?: readonly string[];
  defaultValue?: () => unknown;
  shape?: (() => Record<string, ZodTypeAny>) | Record<string, ZodTypeAny>;
}

const getDef = (schema: ZodTypeAny): IZodDef | undefined => {
  return (schema as unknown as { _def?: IZodDef })._def;
};

const fuzzField = (rng: Rng, schema: ZodTypeAny, defaultValue: unknown): unknown => {
  const def = getDef(schema);
  if (!def) return defaultValue;

  if (def.typeName === 'ZodOptional') {
    if (!coin(rng, 0.5)) return undefined;
    return fuzzField(rng, def.innerType as ZodTypeAny, defaultValue);
  }

  if (def.typeName === 'ZodDefault') {
    const inner = def.innerType as ZodTypeAny;
    const innerDefault = def.defaultValue ? def.defaultValue() : defaultValue;
    return fuzzField(rng, inner, innerDefault);
  }

  if (def.typeName === 'ZodNullable') {
    return fuzzField(rng, def.innerType as ZodTypeAny, defaultValue);
  }

  if (def.typeName === 'ZodEnum') {
    return pick(rng, def.values as readonly string[]);
  }

  if (def.typeName === 'ZodBoolean') {
    return coin(rng, 0.5);
  }

  if (def.typeName === 'ZodNumber') {
    return randomInt(rng, 0, 100);
  }

  if (def.typeName === 'ZodString') {
    // Strings без enum'а не fuzz'им — leave default. Preset решает через
    // refineProps, что подставить (label из wordbank'а и т.п.).
    return defaultValue ?? '';
  }

  // Не распознанный тип — оставляем default.
  return defaultValue;
};
