/**
 * Конвертирует `propsSchema` (ZodObject) в список категорий для generic Inspector.
 *
 * Поддерживает: ZodString, ZodEnum, ZodBoolean, ZodNumber, ZodOptional/ZodDefault (unwrap),
 * ZodUnion (разворот members → скалярное поле, см. ниже).
 * Неизвестные типы пропускаются (graceful degradation).
 *
 * ZodUnion (`cols`/`rows`/`gap` контейнеров = `number | string | …`):
 *   - есть ZodString среди members → `text` — универсально, принимает и число, и
 *     сырой CSS (`repeat(auto-fill, …)`). Если рядом есть ZodNumber-member, поле
 *     получает `coerce: 'number'` — числовая строка эмиттится как number (Grid
 *     трактует number и string по-разному, тип обязан восстановиться).
 *   - иначе есть ZodNumber → `number`.
 *   - иначе пропускается (как неизвестный тип).
 * ZodRecord (`style`) и ZodArray остаются пропускаемыми — скалярного поля для них нет.
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

/** Снимает ZodOptional/ZodDefault-обёртки до содержательной схемы. */
const unwrap = (rawField: any): any => {
  let field = rawField;
  while (field?._def?.typeName === 'ZodOptional' || field?._def?.typeName === 'ZodDefault') {
    field = field._def.innerType ?? field._def.schema;
  }
  return field;
};

export const schemaToInspectorCategories = (schema: ZodTypeAny): ICategory[] => {
  const def = (schema as any)?._def;
  if (!def) return [];

  const shape: Record<string, ZodTypeAny> =
    typeof def.shape === 'function' ? def.shape() : (def.shape ?? {});

  const fields: IFieldDef[] = [];

  for (const [key, rawField] of Object.entries(shape)) {
    if (key.startsWith('data-')) continue;

    const field = unwrap(rawField);
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
    } else if (typeName === 'ZodUnion') {
      const memberTypes = new Set<string>(
        ((field._def.options ?? []) as any[]).map((m) => unwrap(m)?._def?.typeName ?? ''),
      );
      if (memberTypes.has('ZodString')) {
        fields.push({
          key,
          label: key,
          type: 'text',
          ...(memberTypes.has('ZodNumber') ? { coerce: 'number' as const } : {}),
        });
      } else if (memberTypes.has('ZodNumber')) {
        fields.push({ key, label: key, type: 'number' });
      }
      // union без string/number-member'ов (literal'ы, boolean) — пропускаем как раньше
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
