/**
 * `modules/navigation` — nav-блоки зоны learn (переключатели секций).
 *
 * `Main` — главный header-nav (был app-Shape); `Library`/`Lessons` — под-навы
 * (были inline в `capsule.tsx`). Регистрируются вложенно `Learn.Nav.{Main,
 * Library,Lessons}` (решение user: не плодить `MainNav`/`LibraryNav`/… имена).
 * Данные сегментов — из `shared/segments`; визуал/emit — из web-shell.
 */

export { default as Lessons } from './LessonsNav';
export { default as Library } from './LibraryNav';
export { default as Main } from './MainNav';
