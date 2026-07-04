import type { ICell, IRow, LayoutPresets } from '../interfaces';
import { normalizeSlotValue } from '../utils';

type AppShellSlots = LayoutPresets['app-shell'];

/**
 * Built-in preset resolver для `'app-shell'`.
 *
 * `resizable` — tri-state pass-through (2026-07-04): явный `true` на слоте
 * включает его ручку ВСЕГДА (оверрайдит `mode`/global), явный `false` —
 * выключает всегда, `undefined` — активность следует matrix-резолюции
 * (`resize` prop > `mode` > глобальный сигнал). `initialSize` задаёт размер
 * независимо от resizable.
 *
 * «Эластичный центр» — middle-row (вертикально) и main (горизонтально) —
 * дефолтно `resizable: true`: corvu-ручка активна когда АКТИВНЫ ОБА соседа,
 * центр всегда «согласен», поэтому активность ручки определяет флаг
 * периферийного слота (header/footer/sidebar/rightBar), как и ожидается.
 *
 * - header (top, height = initialSize ?? 0.1)
 * - sidebar + main + rightBar (middle row)
 * - footer (bottom)
 *
 * Auto-centroid: если передан только `main` — возвращает single-row single-cell.
 *
 * swapGroup convention (2026-07-04):
 * - Все слоты по умолчанию в ОБЩЕЙ группе `'shell'` — при включённом DnD любой
 *   слот свапается с любым. Прежние партиции ('band' для header/footer, 'aside'
 *   для sidebar/rightBar, main без группы) давали drag-без-drop: бэйдж
 *   показывался, а валидной цели не существовало.
 * - Ограничить свап можно явным `swapGroup` на слотах или `draggable: false`.
 */
export const appShellResolver = (slots: AppShellSlots): IRow[] => {
  const header = normalizeSlotValue(slots.header);
  const sidebar = normalizeSlotValue(slots.sidebar);
  const main = normalizeSlotValue(slots.main);
  if (!main) throw new Error("Matrix preset='app-shell': `main` slot is required.");
  const rightBar = normalizeSlotValue(slots.rightBar);
  const footer = normalizeSlotValue(slots.footer);

  // Auto-centroid: только main — один row, одна cell
  if (!header && !sidebar && !rightBar && !footer) {
    return [
      {
        id: 'centroid-row',
        cells: [
          {
            id: 'main',
            tag: 'main',
            children: main.children,
            skeleton: main.skeleton,
          },
        ],
      },
    ];
  }

  const rows: IRow[] = [];

  // Header row — height = initialSize ?? 0.1; resizable — tri-state pass-through
  // (undefined → активность ручки следует matrix-резолюции).
  if (header) {
    rows.push({
      id: 'header-row',
      height: header.initialSize ?? 0.1,
      resizable: header.resizable,
      cells: [
        {
          id: 'header',
          tag: 'header',
          children: header.children,
          draggable: header.draggable,
          swapGroup: header.swapGroup ?? 'shell',
          resizable: header.resizable,
          bordered: header.bordered,
          skeleton: header.skeleton,
        },
      ],
    });
  }

  // Middle row — sidebar + main + rightBar (resizable)
  const middleCells: ICell[] = [];

  if (sidebar) {
    middleCells.push({
      id: 'sidebar',
      tag: 'aside',
      children: sidebar.children,
      width: sidebar.initialSize ?? 0.2,
      resizable: sidebar.resizable,
      draggable: sidebar.draggable,
      swapGroup: sidebar.swapGroup ?? 'shell',
      bordered: sidebar.bordered,
      skeleton: sidebar.skeleton,
    });
  }

  // Compute main width: if sidebar and rightBar both present, main gets the remainder.
  // If only one aside is present, main takes what's left.
  // If neither, main takes full width.
  const sidebarWidth = sidebar ? (sidebar.initialSize ?? 0.2) : 0;
  const rightBarWidth = rightBar ? (rightBar.initialSize ?? 0.2) : 0;
  const mainWidth = main.initialSize ?? Math.max(0.1, 1 - sidebarWidth - rightBarWidth);

  middleCells.push({
    id: 'main',
    tag: 'main',
    children: main.children,
    width: mainWidth,
    // Эластичный центр: default true — активность горизонтальной ручки
    // определяется флагом соседнего aside-слота (см. doc-блок выше).
    resizable: main.resizable ?? true,
    draggable: main.draggable,
    swapGroup: main.swapGroup ?? 'shell',
    bordered: main.bordered,
    skeleton: main.skeleton,
  });

  if (rightBar) {
    middleCells.push({
      id: 'rightBar',
      tag: 'aside',
      children: rightBar.children,
      width: rightBar.initialSize ?? 0.2,
      resizable: rightBar.resizable,
      draggable: rightBar.draggable,
      swapGroup: rightBar.swapGroup ?? 'shell',
      bordered: rightBar.bordered,
      skeleton: rightBar.skeleton,
    });
  }

  const headerInitialSize = header ? (header.initialSize ?? 0.1) : 0;
  const footerInitialSize = footer ? (footer.initialSize ?? 0.3) : 0;
  const middleHeight: number | 'fr' =
    header || footer
      ? Math.max(0.1, Math.round((1 - headerInitialSize - footerInitialSize) * 1e10) / 1e10)
      : 'fr';

  rows.push({
    id: 'middle-row',
    height: middleHeight,
    // Эластичный центр: всегда true — вертикальная ручка header/footer
    // активируется флагом соответствующего band-слота (corvu ANDит соседей).
    resizable: true,
    cells: middleCells,
  });

  // Footer row — resizable tri-state pass-through.
  if (footer) {
    rows.push({
      id: 'footer-row',
      height: footer.initialSize ?? 0.3,
      resizable: footer.resizable,
      cells: [
        {
          id: 'footer',
          tag: 'footer',
          children: footer.children,
          draggable: footer.draggable,
          swapGroup: footer.swapGroup ?? 'shell',
          resizable: footer.resizable,
          bordered: footer.bordered,
          skeleton: footer.skeleton,
        },
      ],
    });
  }

  return rows;
};
