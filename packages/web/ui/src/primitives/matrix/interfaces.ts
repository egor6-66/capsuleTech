import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import type { AnimateVariant } from '../wrappers/animate';
import type { matrixCva } from './variants';

/**
 * Невидимый для пользователя brand-дискриминатор.
 * Позволяет TS однозначно выбрать ветку `IResizableSlotConfig` в union
 * при написании `sidebar: { }` — автокомплит предлагает children/resizable/...
 * вместо Node-полей JSX.Element.
 */
declare const __slotConfigBrand: unique symbol;

/**
 * Конфигурация слота, который участвует в Resizable-группе.
 *
 * Применяется в горизонтальных (sidebar/main/rightBar) и вертикальных
 * (header/footer) resize-группах. Если `resizable: true` — слот становится
 * corvu Panel'ью. Иначе рендерится статическим блоком.
 *
 * @example
 * ```tsx
 * slots={{
 *   sidebar: { children: <Sidebar />, resizable: true, initialSize: 0.2 },
 *   main:    <Main />,
 * }}
 * ```
 */
export interface IResizableSlotConfig {
  /** @internal brand-discriminator — не задавай вручную */
  readonly [__slotConfigBrand]?: true;
  children: JSX.Element;
  /**
   * **Opt-in.** По умолчанию `false` — object-форма без явного флага визуально
   * идентична JSX-форме (статический блок с дефолтными классами).
   *
   * Чтобы слот реально стал resizable-панелью, нужно поставить `true`.
   */
  resizable?: boolean;
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
}

/**
 * Значение одного слота. Принимается двумя формами:
 *
 *  1. `IResizableSlotConfig` — `{ children, resizable?, initialSize?, minSize?, maxSize? }`.
 *  2. `JSX.Element` — обычный компонент/JSX напрямую.
 *
 * TS-автокомплит при написании `sidebar: { }` подскажет поля
 * `IResizableSlotConfig` благодаря symbol-brand дискриминатору.
 */
export type SlotValue = IResizableSlotConfig | JSX.Element;

/**
 * Набор слотов для Matrix.
 *
 * - `main` — ОБЯЗАТЕЛЬНЫЙ. Центральная область контента.
 * - `header`, `sidebar`, `rightBar`, `footer` — опциональные.
 *
 * Если задан только `main` — Matrix переключается в auto-centroid режим
 * (flex items-center justify-center). Иначе — grid layout с CSS-areas.
 */
export interface IMatrixSlots {
  main: SlotValue;
  header?: SlotValue;
  sidebar?: SlotValue;
  rightBar?: SlotValue;
  footer?: SlotValue;
}

// В Solid используем HTMLAttributes вместо Omit<HTMLDivElement...>
export interface IMatrixBaseProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export type MatrixVariants = VariantProps<typeof matrixCva>;

export interface IMatrixProps extends IMatrixBaseProps {
  slots: IMatrixSlots;
  /**
   * Оборачивает `main`-слот в `<Animate>` если `animated` задан.
   *
   *  - `true` → дефолтный variant `'fade'`.
   *  - `'fade' | 'slide-up' | 'scale' | ...` → конкретный variant.
   *  - `false` / `undefined` → без анимации.
   */
  animated?: boolean | AnimateVariant;
}
