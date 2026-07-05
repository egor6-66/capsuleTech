/**
 * LIBRARY_SEGMENTS — внутренняя база под-разделов library.
 *
 * Единственная точка правды для id/label/description под-навигации library.
 * Используется `Navigation` (переключатель) и app-роутингом (под-вью).
 * НЕ экспортируется в публичный subpath — internal shared knowledge зоны learn.
 *
 * Пакет знает ТОЛЬКО свои сегменты (`explorer`/`collections`), НЕ полный app-URL:
 * под каким префиксом library смонтирован — забота app'а (он ловит
 * `onLibraryNavigate` и сам делает `router.goTo`). Active-state в `Navigation`
 * derived route-prefix-агностично (по последнему сегменту пути).
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
