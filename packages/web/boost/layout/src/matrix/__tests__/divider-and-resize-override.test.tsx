/**
 * Divider-модель `bordered` + per-slot resize override (2026-07-04).
 *
 * Контракты:
 * 1. Слоты Matrix — общее пространство, разделённое hairline-divider'ами,
 *    НЕ независимые карточки: у ячеек нет полного бордера и скруглений.
 * 2. Divider между парой соседей виден когда пара bordered И между ними
 *    не рисуется активная resize-ручка (линия ручки — сама разделитель).
 * 3. `resizable` на слоте — tri-state: true → ручка активна всегда
 *    (оверрайдит mode/global), false → никогда, undefined → следует
 *    matrix-резолюции. Активность ручки НЕ ремоунтит панели.
 *
 * 4. Matrix использует `handleVariant="ghost"`: ручка НИКОГДА не рисует свою
 *    линию (ни активная, ни выключенная) — линии в шве только от `bordered`.
 *
 * DOM-маркеры:
 *  - divider: класс `border-l`/`border-t` + `border-border/60` на cell/row.
 *  - ручка: `[data-corvu-resizable-handle]`; активная — БЕЗ `pointer-events-none`
 *    (drag работает), неактивная — с ним. `bg-border` не бывает ни у одной
 *    (ghost). Grip svg — только на активной при withHandle.
 */
/* @vitest-environment jsdom */
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Matrix } from '../matrix';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

const HANDLE_SEL = '[data-corvu-resizable-handle]';

const activeHandles = (): Element[] =>
  Array.from(container.querySelectorAll(HANDLE_SEL)).filter(
    (h) => !h.classList.contains('pointer-events-none'),
  );

const inactiveHandles = (): Element[] =>
  Array.from(container.querySelectorAll(HANDLE_SEL)).filter((h) =>
    h.classList.contains('pointer-events-none'),
  );

/** Ghost-контракт: ни одна ручка Matrix не рисует свою линию. */
const handlesWithLine = (): Element[] =>
  Array.from(container.querySelectorAll(HANDLE_SEL)).filter((h) =>
    h.classList.contains('bg-border'),
  );

const dividers = (): Element[] =>
  Array.from(container.querySelectorAll('.border-l, .border-t')).filter((el) =>
    el.classList.contains('border-border/60'),
  );

describe('Matrix — cells are a shared space, not cards', () => {
  it('cells render WITHOUT rounded corners and WITHOUT full border box', () => {
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                { id: 'a', tag: 'aside', children: <div>A</div>, width: 0.5 },
                { id: 'b', tag: 'main', children: <div>B</div>, width: 0.5 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const cellA = container.querySelector('aside')!;
    const cellB = container.querySelector('main')!;
    for (const cell of [cellA, cellB]) {
      expect(cell.classList.contains('rounded-sm')).toBe(false);
      // Полного карточного бордера нет — только позиционный border-l возможен.
      expect(cell.classList.contains('border')).toBe(false);
    }
  });
});

describe('Matrix — divider visibility (bordered pair, handle suppression)', () => {
  it('bordered pair + resize OFF → divider on the right cell, handle inactive and lineless', () => {
    // NB: глобальный useResizeMode() дефолтится в true — гасим matrix-пропом.
    cleanup = render(
      () => (
        <Matrix
          bordered
          resize={false}
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                { id: 'a', tag: 'aside', children: <div>A</div>, width: 0.5 },
                { id: 'b', tag: 'main', children: <div>B</div>, width: 0.5 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const cellB = container.querySelector('main')!;
    expect(cellB.classList.contains('border-l')).toBe(true);
    expect(cellB.classList.contains('border-border/60')).toBe(true);
    expect(activeHandles().length).toBe(0);
    expect(inactiveHandles().length).toBeGreaterThan(0);
    expect(handlesWithLine().length).toBe(0);
  });

  it('bordered pair + resize ON → divider STAYS, handle is ghost (no second line)', () => {
    // Разделители — функция ТОЛЬКО bordered; включение resize даёт drag+grip,
    // но не меняет линии (handleVariant="ghost").
    cleanup = render(
      () => (
        <Matrix
          bordered
          resize
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                { id: 'a', tag: 'aside', children: <div>A</div>, width: 0.5 },
                { id: 'b', tag: 'main', children: <div>B</div>, width: 0.5 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const cellB = container.querySelector('main')!;
    expect(cellB.classList.contains('border-l')).toBe(true);
    expect(activeHandles().length).toBeGreaterThan(0);
    // Активная ручка НЕ рисует свою линию — двойной линии не бывает.
    expect(handlesWithLine().length).toBe(0);
  });

  it('bordered OFF + resize ON → no lines at all, only active ghost handle (grip)', () => {
    cleanup = render(
      () => (
        <Matrix
          bordered={false}
          resize
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                { id: 'a', children: <div>A</div>, width: 0.5 },
                { id: 'b', children: <div>B</div>, width: 0.5 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(dividers().length).toBe(0);
    expect(handlesWithLine().length).toBe(0);
    expect(activeHandles().length).toBeGreaterThan(0);
    // Grip-бэйдж на активной ручке присутствует (единственный аффорданс).
    expect(container.querySelectorAll(`${HANDLE_SEL} svg[role="presentation"]`).length).toBe(
      activeHandles().length,
    );
  });

  it('bordered={false} + no explicit slot bordered → no dividers at all', () => {
    cleanup = render(
      () => (
        <Matrix
          bordered={false}
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                { id: 'a', children: <div>A</div>, width: 0.5 },
                { id: 'b', children: <div>B</div>, width: 0.5 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    expect(dividers().length).toBe(0);
  });

  it('matrix bordered={false} + ONE slot bordered:true → pair divider still shows (either-rule)', () => {
    // Кейс library/index.tsx: matrix bordered={false}, main bordered:true —
    // divider между header-row и middle-row должен рисоваться, когда ручка
    // неактивна (mode="view"; при активной ручке разделителем служит её линия).
    cleanup = render(
      () => (
        <Matrix
          bordered={false}
          mode="view"
          preset="app-shell"
          slots={{
            header: { children: <div data-testid="hdr">H</div>, initialSize: 0.1 },
            main: { children: <div data-testid="mn">M</div>, bordered: true },
          }}
        />
      ),
      container,
    );

    // Вертикальный divider над middle-row: renderRow root с border-t.
    const topDividers = Array.from(container.querySelectorAll('.border-t')).filter((el) =>
      el.classList.contains('border-border/60'),
    );
    expect(topDividers.length).toBe(1);
  });
});

describe('Matrix — per-slot resizable override (slot > mode > global)', () => {
  it('mode="view" + slot resizable:true (workspace case) → vertical handle ACTIVE', () => {
    // Зеркало apps/learn/_workspace/index.tsx: header resizable:true при
    // mode="view" — ручка header'а должна работать (slot оверрайдит mode).
    // Middle-row — эластичный центр (всегда согласен).
    cleanup = render(
      () => (
        <Matrix
          mode="view"
          preset="app-shell"
          bordered={false}
          slots={{
            header: {
              children: <div data-testid="hdr">H</div>,
              resizable: true,
              initialSize: 0.1,
            },
            main: { children: <div data-testid="mn">M</div>, resizable: false },
          }}
        />
      ),
      container,
    );

    expect(activeHandles().length).toBe(1);
  });

  it('mode="view" + no explicit flags → all handles INACTIVE', () => {
    cleanup = render(
      () => (
        <Matrix
          mode="view"
          preset="app-shell"
          slots={{
            header: { children: <div>H</div>, initialSize: 0.1 },
            main: <div>M</div>,
          }}
        />
      ),
      container,
    );

    expect(activeHandles().length).toBe(0);
    expect(inactiveHandles().length).toBeGreaterThan(0);
  });

  it('mode="edit" + slot resizable:false → its handle INACTIVE (slot lock wins)', () => {
    cleanup = render(
      () => (
        <Matrix
          mode="edit"
          preset="app-shell"
          slots={{
            header: { children: <div>H</div>, resizable: false, initialSize: 0.1 },
            main: <div>M</div>,
          }}
        />
      ),
      container,
    );

    // header resizable:false → структурно ручки нет вовсе (row.resizable=false
    // убирает handle между header-row и middle-row).
    expect(activeHandles().length).toBe(0);
  });

  it('explorer case: main+rightBar resizable:true → handle active regardless of global', () => {
    cleanup = render(
      () => (
        <Matrix
          preset="app-shell"
          slots={{
            main: { children: <div data-testid="mn">M</div>, resizable: true },
            rightBar: { children: <div data-testid="rb">R</div>, resizable: true },
          }}
        />
      ),
      container,
    );

    // Глобальный resize off, но оба слота явно true → ручка активна.
    expect(activeHandles().length).toBe(1);
  });

  it('live toggle of matrix resize prop flips handle activity WITHOUT remounting panels', () => {
    const [resize, setResize] = createSignal(false);
    cleanup = render(
      () => (
        <Matrix
          resize={resize()}
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                { id: 'a', children: <div data-testid="lt-a">A</div>, width: 0.5 },
                { id: 'b', children: <div data-testid="lt-b">B</div>, width: 0.5 },
              ],
            },
          ]}
        />
      ),
      container,
    );

    const cellARef = container.querySelector('[data-testid="lt-a"]');
    expect(activeHandles().length).toBe(0);

    setResize(true);
    expect(activeHandles().length).toBeGreaterThan(0);
    // Панели не ремоунтились: тот же DOM-узел контента.
    expect(container.querySelector('[data-testid="lt-a"]')).toBe(cellARef);

    setResize(false);
    expect(activeHandles().length).toBe(0);
    expect(container.querySelector('[data-testid="lt-a"]')).toBe(cellARef);
  });
});
