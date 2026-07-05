/**
 * Divider-модель `bordered` + resize-seam инверсия + per-side control
 * (border-1/border-2 брифы, 2026-07-05).
 *
 * Контракты:
 * 1. Слоты Matrix — общее пространство, разделённое hairline-divider'ами,
 *    НЕ независимые карточки: у ячеек нет полного бордера и скруглений.
 * 2. `bordered` — opt-out (default true): разделители есть всегда, точечно
 *    гасятся Matrix-пропом (`bordered={false}`) или per-slot / per-side.
 * 3. **Resize-стык = ОДИН элемент (инверсия).** Когда на шве активна resize-
 *    ручка, ЕЁ hairline (`bg-border`, web-ui после снятия ghost) И ЕСТЬ divider —
 *    Matrix гасит СВОЙ бордер на этой стороне. Раньше рядом стояли две линии
 *    (ghost-ручка `w-px` + Matrix divider) — источник бага img_9/img_10.
 * 4. Per-side (`BorderSides`): `bordered:{side:false}` гасит ОДНУ сторону шва
 *    (kill-wins), для двойного шва у вложенных фреймов.
 * 5. `resizable` на слоте — tri-state (slot > mode > global); флип активности
 *    НЕ ремоунтит панели.
 *
 * DOM-маркеры:
 *  - divider: класс `border-l`/`border-t` + `border-border` (единый токен) на
 *    cell/row.
 *  - активная ручка: `[data-corvu-resizable-handle]` БЕЗ `pointer-events-none`,
 *    С `bg-border` (рисует линию). Grip svg — только на активной при withHandle.
 *  - неактивная ручка: с `pointer-events-none`, без `bg-border`.
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

/** Ручки, рисующие линию: активная ручка после снятия ghost несёт `bg-border`. */
const handlesWithLine = (): Element[] =>
  Array.from(container.querySelectorAll(HANDLE_SEL)).filter((h) =>
    h.classList.contains('bg-border'),
  );

/** Matrix-дивайдеры: позиционный border-l/border-t + единый токен border-border. */
const dividers = (): Element[] =>
  Array.from(container.querySelectorAll('.border-l, .border-t')).filter((el) =>
    el.classList.contains('border-border'),
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

describe('Matrix — divider vs resize-seam (single line, inversion)', () => {
  it('resize OFF → Matrix draws the divider; handle inactive and lineless', () => {
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
    expect(cellB.classList.contains('border-border')).toBe(true);
    expect(activeHandles().length).toBe(0);
    expect(inactiveHandles().length).toBeGreaterThan(0);
    expect(handlesWithLine().length).toBe(0);
  });

  it('resize ON → handle draws the line, Matrix SUPPRESSES its divider (no double line)', () => {
    // Инверсия: активная ручка (bg-border) и есть divider → Matrix гасит свой
    // border-l на этом стыке. На шве ОДНА линия (ручка), не две.
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
    // divider ПОДАВЛЕН — линию рисует ручка.
    expect(cellB.classList.contains('border-l')).toBe(false);
    // Ровно одна линия на стыке — активная ручка с bg-border.
    expect(activeHandles().length).toBe(1);
    expect(handlesWithLine().length).toBe(1);
  });

  it('bordered OFF + resize ON → single active handle line, no Matrix divider', () => {
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
    // Ручка сама рисует линию (единственный аффорданс + разделитель).
    expect(activeHandles().length).toBe(1);
    expect(handlesWithLine().length).toBe(1);
    // Grip-бэйдж на активной ручке.
    expect(container.querySelectorAll(`${HANDLE_SEL} svg[role="presentation"]`).length).toBe(
      activeHandles().length,
    );
  });

  it('bordered={false} + resize OFF → no lines at all', () => {
    cleanup = render(
      () => (
        <Matrix
          bordered={false}
          resize={false}
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
  });

  it('matrix bordered={false} + ONE slot bordered:true, resize OFF → pair divider shows (either-rule)', () => {
    // Кейс library/index.tsx: matrix bordered={false}, main bordered:true —
    // divider между header-row и middle-row рисуется, когда ручка неактивна
    // (mode="view"). При активной ручке разделителем служит её линия.
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

    const topDividers = Array.from(container.querySelectorAll('.border-t')).filter((el) =>
      el.classList.contains('border-border'),
    );
    expect(topDividers.length).toBe(1);
  });
});

describe('Matrix — always-on (opt-out) default + per-side control', () => {
  it('no bordered prop (default true) + resize OFF → divider present', () => {
    cleanup = render(
      () => (
        <Matrix
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
    expect(cellB.classList.contains('border-border')).toBe(true);
  });

  it('per-side opt-out: slot bordered:{left:false} kills its left seam (kill-wins)', () => {
    cleanup = render(
      () => (
        <Matrix
          resize={false}
          rows={[
            {
              id: 'r',
              resizable: true,
              cells: [
                { id: 'a', tag: 'aside', children: <div>A</div>, width: 0.5 },
                {
                  id: 'b',
                  tag: 'main',
                  children: <div>B</div>,
                  width: 0.5,
                  bordered: { left: false },
                },
              ],
            },
          ]}
        />
      ),
      container,
    );

    // b.left=false гасит шов a|b несмотря на a (default on).
    const cellB = container.querySelector('main')!;
    expect(cellB.classList.contains('border-l')).toBe(false);
  });

  it('per-side opt-out (vertical): upper row bordered:{bottom:false} kills the seam below', () => {
    cleanup = render(
      () => (
        <Matrix
          rows={[
            {
              id: 'top',
              cells: [{ id: 'a', children: <div>A</div>, bordered: { bottom: false } }],
            },
            {
              id: 'bot',
              cells: [{ id: 'b', tag: 'main', children: <div>B</div> }],
            },
          ]}
        />
      ),
      container,
    );

    // Шов между top и bot — border-t на нижнем ряду — погашен bottom:false.
    const topDividers = Array.from(container.querySelectorAll('.border-t')).filter((el) =>
      el.classList.contains('border-border'),
    );
    expect(topDividers.length).toBe(0);
  });

  it('single token: divider uses full border-border (not the legacy /60)', () => {
    cleanup = render(
      () => (
        <Matrix
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
    expect(cellB.classList.contains('border-border')).toBe(true);
    expect(cellB.classList.contains('border-border/60')).toBe(false);
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
