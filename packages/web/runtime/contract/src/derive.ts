import type { Contract, SchemaLike } from './types';

/**
 * Достать props-схему из контракта для деривации в манифесте/инспекторе.
 *
 * Generic позволяет consumer'у кастовать к конкретному zod-типу
 * (напр. `z.ZodObject<z.ZodRawShape>`), а leaf остаётся zero-dep —
 * возвращает `SchemaLike` или `undefined`.
 *
 * @example
 * // button.manifest.tsx
 * const baseProps = propsSchemaOf<z.ZodObject<z.ZodRawShape>>(ButtonContract);
 * if (!baseProps) throw new Error('ButtonContract has no props schema');
 * propsSchema: baseProps.extend({ children: z.string().default('Button'), class: z.string().optional() })
 */
export function propsSchemaOf<T = SchemaLike>(contract: Contract): T | undefined {
  return contract.surface.props as T | undefined;
}
