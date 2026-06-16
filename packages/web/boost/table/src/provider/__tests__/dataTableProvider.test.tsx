/**
 * DataTableProvider — тесты shared-data bus и под-компонентов (ADR 036 §6).
 *
 * Контракт:
 *  1. DataTableProvider ставит Solid Context с data/columns/itemMeta/itemPayload.
 *  2. DataTableBody читает Context и рендерит DataTable без дублирования props.
 *  3. DataTableToolbar рендерит children в wrapper-div.
 *  4. Standalone guard: Body/Toolbar/Pagination вне Provider возвращают null + warn.
 *  5. useDataTableContext возвращает null вне Provider.
 *  6. Реактивность: data accessor возвращает актуальный массив.
 */

/* @vitest-environment jsdom */
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DataTableBody,
  DataTableProvider,
  DataTableToolbar,
  useDataTableContext,
} from '../dataTableProvider';

// ---------------------------------------------------------------------------
// Test setup / teardown.
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

const sampleColumns = [{ accessorKey: 'id' as const, header: 'ID' }];
const sampleData = [{ id: 1 }, { id: 2 }, { id: 3 }];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

// ---------------------------------------------------------------------------
// DataTableProvider.
// ---------------------------------------------------------------------------

describe('DataTableProvider', () => {
  it('рендерит children без ошибок', () => {
    expect(() => {
      cleanup = render(
        () => (
          <DataTableProvider data={sampleData} columns={sampleColumns}>
            <div data-testid="child">child</div>
          </DataTableProvider>
        ),
        container,
      );
    }).not.toThrow();

    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DataTableBody.
// ---------------------------------------------------------------------------

describe('DataTableBody', () => {
  it('рендерит таблицу читая data из Provider', () => {
    cleanup = render(
      () => (
        <DataTableProvider data={sampleData} columns={sampleColumns}>
          <DataTableBody />
        </DataTableProvider>
      ),
      container,
    );

    // DataTable рендерит <table>
    expect(container.querySelector('table')).not.toBeNull();
    // Строк в tbody должно соответствовать sampleData.length
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(sampleData.length);
  });

  it('вне Provider: возвращает null + выводит console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanup = render(() => <DataTableBody />, container);

    // Таблицы нет — body вернул null
    expect(container.querySelector('table')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DataTable.Body'));

    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// DataTableToolbar.
// ---------------------------------------------------------------------------

describe('DataTableToolbar', () => {
  it('рендерит children внутри Provider', () => {
    cleanup = render(
      () => (
        <DataTableProvider data={sampleData} columns={sampleColumns}>
          <DataTableToolbar>
            <input data-testid="filter-input" />
          </DataTableToolbar>
        </DataTableProvider>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="filter-input"]')).not.toBeNull();
  });

  it('вне Provider: возвращает null + выводит console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    cleanup = render(
      () => (
        <DataTableToolbar>
          <span>toolbar</span>
        </DataTableToolbar>
      ),
      container,
    );

    expect(container.querySelector('span')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('DataTable.Toolbar'));

    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useDataTableContext.
// ---------------------------------------------------------------------------

describe('useDataTableContext', () => {
  it('вне Provider: возвращает null', () => {
    let ctxValue: ReturnType<typeof useDataTableContext> | undefined;

    cleanup = render(() => {
      ctxValue = useDataTableContext();
      return <div />;
    }, container);

    expect(ctxValue).toBeNull();
  });

  it('внутри Provider: возвращает context с data accessor', () => {
    let ctxValue: ReturnType<typeof useDataTableContext> | undefined;

    cleanup = render(
      () => (
        <DataTableProvider data={sampleData} columns={sampleColumns}>
          {(() => {
            ctxValue = useDataTableContext();
            return <div />;
          })()}
        </DataTableProvider>
      ),
      container,
    );

    expect(ctxValue).not.toBeNull();
    expect(ctxValue!.data()).toEqual(sampleData);
    expect(ctxValue!.columns()).toEqual(sampleColumns);
  });

  it('data accessor реактивен: отражает обновлённый массив', () => {
    const [data, setData] = createSignal(sampleData);
    let ctxValue: ReturnType<typeof useDataTableContext> | undefined;

    cleanup = render(
      () => (
        <DataTableProvider data={data()} columns={sampleColumns}>
          {(() => {
            ctxValue = useDataTableContext();
            return <div />;
          })()}
        </DataTableProvider>
      ),
      container,
    );

    expect(ctxValue!.data()).toHaveLength(3);

    const newData = [{ id: 10 }, { id: 20 }];
    setData(newData);

    expect(ctxValue!.data()).toHaveLength(2);
    expect(ctxValue!.data()).toEqual(newData);
  });

  it('itemMeta и itemPayload передаются через Context', () => {
    const itemMeta = (row: any) => ({ tags: ['row'], id: row.id });
    const itemPayload = (row: any) => ({ id: row.id });
    let ctxValue: ReturnType<typeof useDataTableContext> | undefined;

    cleanup = render(
      () => (
        <DataTableProvider
          data={sampleData}
          columns={sampleColumns}
          itemMeta={itemMeta}
          itemPayload={itemPayload}
        >
          {(() => {
            ctxValue = useDataTableContext();
            return <div />;
          })()}
        </DataTableProvider>
      ),
      container,
    );

    expect(ctxValue!.itemMeta).toBe(itemMeta);
    expect(ctxValue!.itemPayload).toBe(itemPayload);
  });
});

// ---------------------------------------------------------------------------
// Provider + Body: onRowClick escape-hatch.
// ---------------------------------------------------------------------------

describe('DataTableProvider + DataTableBody: onRowClick', () => {
  it('onRowClick из Provider пробрасывается в строки DataTable', () => {
    const onRowClick = vi.fn();

    cleanup = render(
      () => (
        <DataTableProvider
          data={sampleData}
          columns={sampleColumns}
          itemMeta={(row: any) => ({ tags: ['row'], id: row.id })}
          itemPayload={(row: any) => ({ id: row.id })}
          onRowClick={onRowClick}
        >
          <DataTableBody />
        </DataTableProvider>
      ),
      container,
    );

    const firstRow = container.querySelector<HTMLTableRowElement>('tbody tr');
    expect(firstRow).not.toBeNull();
    firstRow!.click();

    expect(onRowClick).toHaveBeenCalledOnce();
    const [target] = onRowClick.mock.calls[0];
    expect(target.meta.tags).toEqual(['row']);
    expect(target.payload).toEqual({ id: 1 });
  });
});
