export { z } from './z';
export type { CapsuleZ } from './z';

// Re-export zod-типов для advanced-кейсов (без runtime — type-only).
export type { ZodType, ZodTypeAny, ZodArray, ZodObject } from 'zod';
