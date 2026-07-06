/**
 * concepts/types — контракты библиотеки прозы (концепты, ADR 067 / ADR 069).
 * Плейн-формы learn-BFF (пакетный слой не знает про Entity/zod). Тело концепта —
 * markdown-строка (`body`), рендерится через `@capsuletech/web-docs`.
 */

/** Пример к концепту (en/ru + опц. картинка). */
export interface ILessonExample {
  en: string;
  ru: string;
  image?: string | null;
}

/**
 * Фасет группировки концепта в аккордеон-IA (ADR 069). `approach` — дефолт при
 * отсутствии `kind` во frontmatter. Ru-подписи/порядок групп — в блоке `Concepts`.
 */
export type ConceptKind = 'approach' | 'pattern' | 'recommendation';

/** Концепт — проза (принцип + markdown-тело). */
export interface IConcept {
  id: string;
  title: string;
  principle: string;
  body: string;
  tags: string[];
  examples: ILessonExample[];
  relatedRules: string[];
  relatedConcepts: string[];
}

/**
 * Элемент списка `/learn/concepts` — карточка библиотеки прозы (без тела).
 * `kind`/`sortOrder` — группировка/порядок для аккордеона (ADR 069).
 */
export interface IConceptSummary {
  id: string;
  title: string;
  principle: string;
  tags: string[];
  kind: ConceptKind;
  sortOrder: number;
}
