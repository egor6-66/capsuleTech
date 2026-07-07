/**
 * `shared/segments` — единый источник nav-сегментов студии (атом).
 *
 * Единственная точка правды для id/label/description сегментов (store/creator).
 * Читают ДВА концерна: `modules/navigation/MainNav` (header-таббар) и
 * `modules/welcome/Welcome` (карточки-лаунчеры) — поэтому набор живёт в `shared/`
 * (атом), а не в модуле (анатомия: `shared ← core ← modules`; убрана горизонталь
 * welcome→navigation).
 *
 * Пакет знает ТОЛЬКО id/подписи сегментов, НЕ app-путь: под каким префиксом
 * секция смонтирована — забота app'а (ловит `onSegmentNavigate` → `router.goTo`).
 * Active-state derived route-prefix-агностично (`useActiveSegment`), поэтому
 * `STUDIO_BASE` (хардкод пути) удалён.
 */

export type SegmentId = 'store' | 'creator';

export interface ISegment {
  id: SegmentId;
  label: string;
  /** Краткое описание раздела для welcome-карточек. */
  description: string;
}

export const SEGMENTS: readonly ISegment[] = [
  {
    id: 'store',
    label: 'Store',
    description:
      'Холст с палитрой компонентов, инспектором настроек и панелью контракта. Точка входа для сборки нового компонента из примитивов.',
  },
  {
    id: 'creator',
    label: 'Creator',
    description: "Procedural-генераторы UI-деревьев из preset'ов. Раздел в разработке.",
  },
] as const;
