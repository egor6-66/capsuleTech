/**
 * LEARN_SEGMENTS — внутренняя база разделов обучающего app'а.
 *
 * Единственная точка правды для id/label/description сегментов.
 * Используется Welcome (карточки-навигаторы); при наполнении — и навигацией,
 * чтобы оба источника эмитили идентичный `onNavigate` payload.
 *
 * НЕ экспортируется в публичный subpath напрямую — shared knowledge зоны learn.
 */
export type LearnSegmentId = 'lessons' | 'exercises' | 'progress' | 'library';

export interface ILearnSegment {
  id: LearnSegmentId;
  label: string;
  description: string;
}

export const LEARN_SEGMENTS: ILearnSegment[] = [
  { id: 'lessons', label: 'Lessons', description: 'Концепты и теория' },
  { id: 'exercises', label: 'Exercises', description: 'Упражнения' },
  { id: 'progress', label: 'Progress', description: 'Прогресс и навыки' },
  { id: 'library', label: 'Library', description: 'Словарь и закладки' },
];
