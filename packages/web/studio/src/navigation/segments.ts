/**
 * SEGMENTS — внутренняя база разделов студии.
 *
 * Единственная точка правды для id/label/description сегментов.
 * Используется Navigation (кнопки-таббар) и Welcome (карточки-навигаторы),
 * чтобы оба модуля эмитили идентичный `onNavigate` payload.
 *
 * НЕ экспортируется в публичный subpath пакета — internal shared knowledge.
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

export const STUDIO_BASE = '/workspace/web-studio';
