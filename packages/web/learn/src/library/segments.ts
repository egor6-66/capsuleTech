/**
 * LIBRARY_SEGMENTS — внутренняя база под-разделов library.
 *
 * Единственная точка правды для id/label/description под-навигации library.
 * Используется `Navigation` (переключатель) и app-роутингом (под-вью).
 * НЕ экспортируется в публичный subpath — internal shared knowledge зоны learn.
 *
 * `LIBRARY_BASE` хардкодит app-роут — известный studio-pattern (`STUDIO_BASE`);
 * пропификация base — отдельно позже (по сигналу architect).
 */
export type LibrarySegmentId = 'explorer' | 'collections';

export interface ILibrarySegment {
  id: LibrarySegmentId;
  label: string;
  /** Краткое описание под-раздела. */
  description: string;
}

export const LIBRARY_SEGMENTS: readonly ILibrarySegment[] = [
  { id: 'explorer', label: 'Explorer', description: 'Поиск слова, связи, синонимы, фонетика.' },
  { id: 'collections', label: 'Collections', description: 'Сохранённые списки и закладки.' },
] as const;

export const LIBRARY_BASE = '/workspace/library';
