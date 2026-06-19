/**
 * Конвертирует `propsSchema` (ZodObject) в список категорий для generic Inspector.
 *
 * Поддерживает: ZodString, ZodEnum, ZodBoolean, ZodNumber, ZodOptional/ZodDefault (unwrap).
 * Неизвестные типы пропускаются (graceful degradation).
 *
 * НЕ принимает values — categories описывают **структуру** полей, не их значения.
 * Возврат стабилен по ref'у при том же schema-объекте (важно для createMemo →
 * Inspector не remount'ит fields при изменении values).
 *
 * Поля сортируются по типу (selects → inputs → switches) для визуальной
 * упорядоченности Inspector'а. Внутри группы сохраняется declaration order
 * схемы (JS sort стабилен с ES2019).
 */

import type { ZodTypeAny } from '@capsuletech/shared-zod';
import type { ICategory, IFieldDef } from './types';

/**
 * Группа поля для сортировки Inspector'а:
 *   0 — selects (enum-выбор из фиксированного списка)
 *   1 — inputs  (text/textarea/number/number-unit — ручной ввод)
 *   2 — switches (boolean toggle)
 */
const FIELD_TYPE_ORDER: Record<IFieldDef['type'], number> = {
  select: 0,
  text: 1,
  textarea: 1,
  number: 1,
  'number-unit': 1,
  boolean: 2,
};

export const schemaToInspectorCategories = (schema: ZodTypeAny): ICategory[] => {
  // biome-ignore lint/suspicious/noExplicitAny: zod internals access
  const def = (schema as any)?._def;
  if (!def) return [];

  // biome-ignore lint/suspicious/noExplicitAny: zod shape() / shape
  const shape: Record<string, ZodTypeAny> =
    typeof def.shape === 'function' ? def.shape() : (def.shape ?? {});

  const fields: IFieldDef[] = [];

  for (const [key, rawField] of Object.entries(shape)) {
    if (key.startsWith('data-')) continue;

    // biome-ignore lint/suspicious/noExplicitAny: zod wrapper unwrap
    let field: any = rawField;
    while (field?._def?.typeName === 'ZodOptional' || field?._def?.typeName === 'ZodDefault') {
      field = field._def.innerType ?? field._def.schema;
    }

    const typeName: string = field?._def?.typeName ?? '';

    if (typeName === 'ZodString') {
      fields.push({ key, label: key, type: 'text' });
    } else if (typeName === 'ZodEnum') {
      const options: { value: string; label?: string }[] = (field._def.values as string[]).map(
        (v) => ({ value: v }),
      );
      fields.push({ key, label: key, type: 'select', options });
    } else if (typeName === 'ZodBoolean') {
      fields.push({ key, label: key, type: 'boolean' });
    } else if (typeName === 'ZodNumber') {
      fields.push({ key, label: key, type: 'number' });
    }
  }

  if (fields.length === 0) return [];

  fields.sort((a, b) => FIELD_TYPE_ORDER[a.type] - FIELD_TYPE_ORDER[b.type]);

  return [
    {
      id: 'props',
      label: 'Props',
      fields,
    },
  ];
};
