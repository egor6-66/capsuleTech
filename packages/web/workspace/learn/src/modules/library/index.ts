// library-модуль: композиты library-раздела (импортят атомы из `shared/`).
// `Words`/`Search`/`WordTile`/`wordsStore`/`ISense` промоутнуты в `shared/words`
// и `shared/search` (атомы, юзают многие) — здесь остаются только
// library-view-концерны: `Info` (деталь выбранного слова, читает `wordsStore`)
// + плейсхолдеры `Collections`/`BookmarkButton`.

// Сегменты library переехали в `shared/segments` (единый источник) — реэкспорт
// типов для backward-compat `./library` subpath (данные читает `modules/navigation`).
export type { ILibrarySegment, LibrarySegmentId } from '../../shared/segments';
export { BookmarkButton, type IBookmarkButtonProps } from './BookmarkButton';
export { Collections, type ICollectionsProps } from './Collections';
export { type IInfoEvents, type IInfoProps, Info } from './Info';
