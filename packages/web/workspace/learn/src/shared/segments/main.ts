/**
 * MAIN_SEGMENTS — единый источник top-level разделов обучающего app'а.
 *
 * Единственная точка правды для id/label/description главных секций learn.
 * Читают ДВА концерна: `modules/navigation/MainNav` (header-nav) и
 * `modules/welcome/Welcome` (лаунчер-карточки) — поэтому набор живёт в `shared/`
 * (атом), а не в модуле (анатомия: `shared ← core ← modules`).
 *
 * Был `modules/welcome/segments.ts:LEARN_SEGMENTS`. При консолидации добавлен
 * `guides` — раньше он жил только в app-shape навигации (`shapes/shellNavigation`
 * → пункт `Guides` → `/guides`), а `LEARN_SEGMENTS` его не знал (дрейф двух
 * источников). Единый источник = ВСЕ top-level секции, у которых есть модуль +
 * роут: `modules/guides/` + `pages/_workspace/guides/` существуют.
 *
 * Пакет знает ТОЛЬКО id/подписи сегментов, НЕ полный app-URL: под каким
 * префиксом секция смонтирована — забота app'а (ловит `onSegmentNavigate` и
 * делает `router.goTo`). Active-state derived route-prefix-агностично.
 */
export type MainSegmentId = 'lessons' | 'exercises' | 'progress' | 'library' | 'guides';

export interface IMainSegment {
  id: MainSegmentId;
  label: string;
  /** Краткое описание секции (используется карточками лаунчера). */
  description: string;
}

export const MAIN_SEGMENTS: readonly IMainSegment[] = [
  { id: 'lessons', label: 'Lessons', description: 'Концепты и теория' },
  { id: 'exercises', label: 'Exercises', description: 'Упражнения' },
  { id: 'progress', label: 'Progress', description: 'Прогресс и навыки' },
  { id: 'library', label: 'Library', description: 'Словарь и закладки' },
  { id: 'guides', label: 'Guides', description: 'Туры и подсказки по интерфейсу' },
] as const;
