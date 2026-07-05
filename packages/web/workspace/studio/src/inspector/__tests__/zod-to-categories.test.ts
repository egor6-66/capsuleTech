import { z } from '@capsuletech/shared-zod';
import { describe, expect, it } from 'vitest';
import type { ITextField } from '../types';
import { schemaToInspectorCategories } from '../zod-to-categories';

const fieldsOf = (schema: Parameters<typeof schemaToInspectorCategories>[0]) =>
  schemaToInspectorCategories(schema)[0]?.fields ?? [];

describe('schemaToInspectorCategories — скаляры (регресс)', () => {
  it('маппит string/enum/boolean/number, unwrap optional/default', () => {
    const fields = fieldsOf(
      z.object({
        title: z.string().optional(),
        tone: z.enum(['muted', 'accent']).default('muted'),
        inline: z.boolean().optional(),
        order: z.number(),
      }),
    );
    expect(fields.map((f) => [f.key, f.type])).toEqual([
      ['tone', 'select'],
      ['title', 'text'],
      ['order', 'number'],
      ['inline', 'boolean'],
    ]);
  });
});

describe('schemaToInspectorCategories — ZodUnion', () => {
  it('number|string → text с coerce number (Grid gap)', () => {
    const fields = fieldsOf(z.object({ gap: z.union([z.number(), z.string()]).optional() }));
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ key: 'gap', type: 'text', coerce: 'number' });
  });

  it('number|string|array(string) → text (Grid cols/rows track)', () => {
    const track = z.union([z.number(), z.string(), z.array(z.string())]);
    const fields = fieldsOf(z.object({ cols: track.optional(), rows: track.optional() }));
    expect(fields.map((f) => [f.key, f.type])).toEqual([
      ['cols', 'text'],
      ['rows', 'text'],
    ]);
    expect((fields[0] as ITextField).coerce).toBe('number');
  });

  it('number|literal (без string) → number (Flex sizingScale)', () => {
    const fields = fieldsOf(z.object({ grow: z.union([z.number(), z.literal('full')]) }));
    // z.literal('full') — ZodLiteral, не ZodString: union резолвится в number
    expect(fields).toEqual([{ key: 'grow', label: 'grow', type: 'number' }]);
  });

  it('union без string/number-member (aria-invalid) — пропускается', () => {
    const fields = fieldsOf(
      z.object({
        'aria-invalid': z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
      }),
    );
    expect(fields).toHaveLength(0);
  });

  it('string-only union БЕЗ coerce-флага', () => {
    const fields = fieldsOf(z.object({ w: z.union([z.string(), z.array(z.string())]) }));
    expect(fields[0]).toEqual({ key: 'w', label: 'w', type: 'text' });
    expect((fields[0] as ITextField).coerce).toBeUndefined();
  });

  it('optional/default-обёртки у member-схем тоже unwrap-ятся', () => {
    const fields = fieldsOf(
      z.object({ gap: z.union([z.number().default(0), z.string().optional()]) }),
    );
    expect(fields[0]).toMatchObject({ key: 'gap', type: 'text', coerce: 'number' });
  });
});

describe('schemaToInspectorCategories — graceful skip (регресс)', () => {
  it('ZodRecord (style) и ZodArray пропускаются', () => {
    const fields = fieldsOf(
      z.object({
        style: z.record(z.string()).optional(),
        areas: z.array(z.string()).optional(),
        gap: z.union([z.number(), z.string()]).optional(),
      }),
    );
    expect(fields.map((f) => f.key)).toEqual(['gap']);
  });
});
