import type { JSX } from 'solid-js';

export type ResizableOrientation = 'horizontal' | 'vertical';

/** Описание одной панели в Resizable. */
export interface IResizableItem {
  children: JSX.Element;
  /** Доля от общего размера (0..1). Если undefined — раздаётся равномерно среди undefined. */
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  /**
   * false → панель не участвует в resize (нет handle перед/после).
   * true (default) → handle инжектируется между resizable-соседями.
   */
  resizable?: boolean;
}

export interface IResizableProps {
  /** Массив панелей. Если задан — используется как источник правды. */
  items?: IResizableItem[];
  /** Дети как JSX — каждый верхне-уровневый элемент превращается в IResizableItem с resizable=true. */
  children?: JSX.Element;
  /** Ось распределения панелей. По умолчанию `horizontal`. */
  orientation?: ResizableOrientation;
  /** Показать grip-индикатор на handle'е. */
  withHandle?: boolean;
  /** Заблокировать pointer на handle'ах (раскладка применяется, drag нет). */
  handleDisabled?: boolean;
  /** Callback с новыми размерами при ресайзе (forwarded в corvu). */
  onSizesChange?: (sizes: number[]) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}
