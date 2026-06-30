import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

// Трек: число (→ repeat(N, minmax(0,1fr))), сырая CSS-строка или массив строк.
const track = z.union([z.number(), z.string(), z.array(z.string())]);
// Gap: число (× 0.25rem, как Tailwind) или сырое CSS-значение / токен-строка.
const gap = z.union([z.number(), z.string()]);

/**
 * GridContract — декларативный контракт Grid-контейнера для studio inspector,
 * palette preview, DnD-валидации.
 *
 * Grid — container, НЕ leaf. Принимает любых детей (без rule.accepts).
 * `areas` / `autoRows` / `autoCols` — advanced, в палитра-контракт не выносим
 * (редкие, проще задать через style). `class` / `style` — inspector-only,
 * расширяются в propsSchema манифеста.
 *
 * @see grid.manifest.tsx — где контракт используется через propsSchemaOf
 * @see grid.presets.ts — пресеты для палитры студио
 */
export const GridContract = defineContract({ name: 'Grid', kind: 'primitive' }, [
  rule.props(
    z.object({
      // grid-template-columns. Число N → N равных колонок.
      cols: track.optional(),
      // grid-template-rows. Те же правила, что у cols.
      rows: track.optional(),
      gap: gap.optional(),
      gapX: gap.optional(),
      gapY: gap.optional(),
      // grid-auto-flow — направление авторазмещения детей.
      autoFlow: z.enum(['row', 'column', 'dense', 'row dense', 'column dense']).optional(),
      // display: inline-grid.
      inline: z.boolean().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'two-col', props: { cols: 2, gap: 2 } },
    { name: 'three-col', props: { cols: 3, gap: 2 } },
    { name: 'auto-fit', props: { cols: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 2 } },
    { name: 'with-rows', props: { cols: 3, rows: 2, gap: 2 } },
  ]),
]);
