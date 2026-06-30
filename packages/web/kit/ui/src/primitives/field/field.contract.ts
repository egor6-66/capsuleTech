import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

/**
 * FieldContract — декларативный контракт Field-композиции для studio inspector,
 * palette preview, DnD-валидации.
 *
 * Field — композиция form-поля: метка + ввод + описание/ошибка. Принимает
 * только свои части (`Field.Label` / `Field.Content` / `Field.Description` /
 * `Field.Error`). `orientation` управляет раскладкой (колонка / строка /
 * адаптив). `class` — inspector-only, расширяется в propsSchema манифеста.
 *
 * @see field.manifest.tsx — propsSchemaOf
 * @see field.presets.ts — пресеты для палитры студио
 */
export const FieldContract = defineContract({ name: 'Field', kind: 'composition' }, [
  rule.accepts(['Field.Label', 'Field.Content', 'Field.Description', 'Field.Error']),
  rule.props(
    z.object({
      // vertical — метка над вводом (default); horizontal — метка слева; responsive — адаптив.
      orientation: z.enum(['vertical', 'horizontal', 'responsive']).optional(),
    }),
  ),
  rule.styleSlots(['root', 'label', 'content', 'description', 'error']),
  rule.examples([
    {
      name: 'vertical',
      props: { orientation: 'vertical' },
      children: [
        { name: 'Field.Label', props: {} },
        { name: 'Field.Content', props: {} },
        { name: 'Field.Description', props: {} },
      ],
    },
    {
      name: 'with-error',
      props: { orientation: 'vertical' },
      children: [
        { name: 'Field.Label', props: {} },
        { name: 'Field.Content', props: {} },
        { name: 'Field.Error', props: {} },
      ],
    },
  ]),
]);
