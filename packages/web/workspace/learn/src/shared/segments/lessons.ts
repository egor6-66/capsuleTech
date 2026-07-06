/**
 * LESSONS_SEGMENTS — под-разделы Lessons (зеркало library-сегментов).
 *
 * Единственная точка правды для id/label под-навигации раздела Lessons:
 * `concepts` (библиотека прозы) / `rules` (справочник). Читают
 * `modules/navigation/LessonsNav` (переключатель) и
 * `modules/welcome/LessonsWelcome` (лаунчер) → атом в `shared/`.
 *
 * Пакет знает ТОЛЬКО свои сегменты, НЕ полный app-URL: под каким префиксом
 * Lessons смонтирован — забота app'а. Active-state derived route-prefix-агностично.
 */
export type LessonsSegmentId = 'concepts' | 'rules';

export interface ILessonsSegment {
  id: LessonsSegmentId;
  label: string;
  /** Краткое описание под-раздела. */
  description: string;
}

export const LESSONS_SEGMENTS: readonly ILessonsSegment[] = [
  { id: 'concepts', label: 'Concepts', description: 'Библиотека прозы: принципы и объяснения.' },
  { id: 'rules', label: 'Rules', description: 'Справочник грамматики; у правила — его дриллы.' },
] as const;
