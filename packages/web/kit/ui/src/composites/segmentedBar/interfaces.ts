import type { JSX } from 'solid-js';

/** Один сегмент бара. */
export interface ISegmentedBarItem {
  /** Стабильный id сегмента — приходит в `onSelect`, сверяется с `activeId`. */
  id: string;
  /** Видимая подпись сегмента. */
  label: string;
}

/**
 * SegmentedBar — stateless сегмент-бар. Роутер/emit ему не известны:
 * `activeId` приходит извне (в shell — производная от `web-router`), клик
 * отдаёт `id` наружу через `onSelect`. Consumer решает что делать.
 */
export interface ISegmentedBarProps {
  /** Сегменты в порядке отображения. */
  items: readonly ISegmentedBarItem[];
  /** id активного сегмента — подсветка. Приходит извне (shell). */
  activeId?: string;
  /** Клик по сегменту — отдаёт его id. Роутинг/emit — забота consumer'а. */
  onSelect: (id: string) => void;
  /** Имя пресета вида — резолвится в конфиг (см. `segmentedBar.presets.ts`). Default — `'default'`. */
  preset?: string;
  /** Passthrough-класс на контейнер (напр. центрирование `mx-auto w-fit` в shell). */
  class?: string;
  /** Passthrough-стиль на контейнер. */
  style?: JSX.CSSProperties | string;
}
