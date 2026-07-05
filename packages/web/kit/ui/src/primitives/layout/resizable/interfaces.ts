import type { Accessor, JSX } from 'solid-js';

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
   * Структурный флаг: false → панель не участвует в resize (нет handle перед/после).
   * true (default) → handle инжектируется между resizable-соседями.
   * Live-флип пересоздаёт дерево панелей — для реактивного вкл/выкл ручки
   * без ремоунта используй `handleActive`.
   */
  resizable?: boolean;
  /**
   * Реактивная активность ручки. Default: true.
   * Handle между i и i+1 активен ⇔ active(i) && active(i+1) && !handleDisabled (контейнерный).
   * false → handle остаётся смонтирован (панели не ремоунтятся), но прозрачен
   * (без bg-border), pointer-events-none, без grip, corvu drag отключён.
   * Accessor-форма — для live-флипа без пересоздания items-массива.
   */
  handleActive?: boolean | Accessor<boolean>;
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
  /**
   * Глобальный гейт активности всех handle'ов (AND с per-item `handleActive`).
   * true → каждая ручка неактивна: прозрачна (без линии), pointer-events-none,
   * без grip. Раскладка панелей при этом сохраняется.
   */
  handleDisabled?: boolean;
  /** Callback с новыми размерами при ресайзе (forwarded в corvu). */
  onSizesChange?: (sizes: number[]) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}
