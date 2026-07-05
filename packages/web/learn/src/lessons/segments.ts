/**
 * LESSONS_SEGMENTS — внутренняя база под-разделов Lessons (зеркало
 * `library/segments.ts`).
 *
 * Единственная точка правды для id/label под-навигации раздела Lessons:
 * `concepts` (библиотека прозы) / `rules` (справочник). Используется `Nav`
 * (переключатель) и app-роутингом (под-вью). НЕ экспортируется в публичный
 * subpath как значение сегментов app'а — internal shared knowledge зоны learn;
 * тип `LessonsSegmentId` реэкспортится для типизации хендлера события.
 *
 * Пакет знает ТОЛЬКО свои сегменты, НЕ полный app-URL: под каким префиксом
 * Lessons смонтирован — забота app'а (он ловит `onLessonsNavigate` и делает
 * `router.goTo`). Active-state в `Nav` derived route-prefix-агностично.
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
