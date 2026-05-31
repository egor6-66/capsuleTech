import type { JSX } from 'solid-js';
import type { AnimateVariant } from '../../wrappers/animate';

/**
 * SlotValue — либо JSX-элемент напрямую, либо объект с children + overrides.
 *
 * JSX-форма: `header: <MyHeader />` — обёртывается в normalizeSlotValue.
 * Object-форма: `header: { children: <MyHeader />, initialSize: 0.2, ... }`
 *
 * Heuristic: если у объекта есть ключ `children` — считается object-формой.
 */
export type SlotValue =
  | JSX.Element
  | {
      children: JSX.Element;
      initialSize?: number;
      minSize?: number;
      maxSize?: number;
      draggable?: boolean;
      /**
       * Группа, внутри которой возможен swap/insert через DnD.
       * Cells с одинаковой `swapGroup` могут меняться местами.
       *
       * Если не задан в slot — preset присваивает дефолт по позиции:
       *   - `'band'` для header/footer,
       *   - `'aside'` для sidebar/rightBar,
       *   - `undefined` для main (нельзя свапить).
       *
       * Чтобы свапать main вместе с aside / band — задай явный
       * общий `swapGroup` на нужных слотах.
       */
      swapGroup?: string;
      /**
       * Явный override resizable для slot.
       *
       * - header: default = true (vertical resize). Size = initialSize ?? 0.1.
       * - sidebar/main/rightBar: default = true (horizontal resize).
       * - footer: default = true (vertical resize row).
       *
       * Если не задан — preset применяет свои defaults.
       */
      resizable?: boolean;
      /**
       * Per-slot settings panel. Rendered as a toolbar strip at the top of the
       * cell when the global `settingsMode` is ON. Hidden in normal view.
       *
       * Usage:
       *   `settings: <MyWidgetSettingsPanel />`
       */
      settings?: JSX.Element;
    };

export interface IRow {
  id?: string;
  /**
   * Высота row.
   * - `number` (0..1) → corvu Panel initialSize (доля от родителя)
   * - `'auto'` → content-height, не resizable
   * - `'fr'` → flex-1 (grow)
   */
  height?: number | 'auto' | 'fr';
  resizable?: boolean;
  cells: ICell[];
}

export interface ICell {
  id: string;
  children: JSX.Element;
  tag?: 'div' | 'header' | 'aside' | 'main' | 'footer' | 'nav' | 'section';
  /**
   * Ширина cell.
   * - `number` (0..1) → corvu Panel initialSize
   * - `'auto'` → content-width
   * - `'fr'` → flex-1
   */
  width?: number | 'auto' | 'fr';
  resizable?: boolean;
  draggable?: boolean;
  swapGroup?: string;
  /**
   * Per-cell settings panel. Rendered as a toolbar strip at the top of the
   * cell when the global `settingsMode` is ON. Hidden in normal view.
   * Threaded from SlotValue.settings through preset → ICell by the resolvers.
   */
  settings?: JSX.Element;
}

// ---------------------------------------------------------------------------
// Preset registry — расширяется через ./presets
// ---------------------------------------------------------------------------

/**
 * Реестр встроенных пресетов. Ключ — имя пресета, значение — тип `slots`.
 * Расширяется по мере добавления новых built-in пресетов.
 */
export interface LayoutPresets {
  'app-shell': {
    header?: SlotValue;
    sidebar?: SlotValue;
    main: SlotValue;
    rightBar?: SlotValue;
    footer?: SlotValue;
  };
  // Будущие: 'split-2', 'split-3', 'dashboard-grid', ...
}

// ---------------------------------------------------------------------------
// DnD / layout mode (Phase 1.2 placeholders)
// ---------------------------------------------------------------------------

export type MatrixDndMode = 'swap' | 'insert';

export type MatrixLayoutMode = 'view' | 'edit';

export type LayoutChangeEvent =
  | { kind: 'swap'; a: string; b: string }
  | { kind: 'insert'; id: string; toRow: number; toIndex: number };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IMatrixCommonProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * Оборачивает cell с id 'main' в `<Animate>` если задан.
   *
   * - `true` → дефолтный variant `'fade'`.
   * - `'fade' | 'slide-up' | 'scale' | ...` → конкретный variant.
   * - `false` / `undefined` → без анимации.
   */
  animated?: boolean | AnimateVariant;
  dndMode?: MatrixDndMode;
  layoutMode?: MatrixLayoutMode;
  onLayoutChange?: (event: LayoutChangeEvent) => void;
}

/**
 * Raw rows mode — передаёт rows напрямую, без пресета.
 */
export interface IMatrixRawProps extends IMatrixCommonProps {
  rows: IRow[];
  preset?: never;
  slots?: never;
}

/**
 * Preset mode — именованный пресет + типизированные slots.
 */
export interface IMatrixPresetProps<P extends keyof LayoutPresets = keyof LayoutPresets>
  extends IMatrixCommonProps {
  preset: P;
  slots: LayoutPresets[P];
  rows?: never;
}

/**
 * Discriminated union: либо raw rows, либо preset+slots.
 */
export type IMatrixProps = IMatrixRawProps | IMatrixPresetProps;
