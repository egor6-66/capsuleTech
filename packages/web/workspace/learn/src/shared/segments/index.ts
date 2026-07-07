/**
 * `shared/segments` — единый источник nav-сегментов зоны learn (атом).
 *
 * Собирает три набора (main / library / lessons) в одну точку правды. Читают
 * `modules/navigation/*` (переключатели) и `modules/welcome/*` (лаунчеры).
 * Ранее данные были размазаны по `modules/{welcome,library,lessons}/segments.ts`
 * + дубль main-набора в app-shape (`shapes/shellNavigation`); консолидация
 * убрала дубль и дрейф (`guides` теперь в общем main-наборе).
 *
 * Направление строгое: `shared/` не импортит `core/`/`modules/` (только данные).
 */

export { type ILessonsSegment, LESSONS_SEGMENTS, type LessonsSegmentId } from './lessons';
export { type ILibrarySegment, LIBRARY_SEGMENTS, type LibrarySegmentId } from './library';
export { type IMainSegment, MAIN_SEGMENTS, type MainSegmentId } from './main';
