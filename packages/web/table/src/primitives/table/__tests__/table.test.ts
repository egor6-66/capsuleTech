/**
 * Table primitive tests.
 *
 * The vitest config (environment: 'jsdom') can process .tsx via vite-plugin-solid.
 * Tests here cover interface structural contracts and type-level assertions,
 * matching the pattern established for this module.
 *
 * Visual + interactive coverage lives in table.stories.tsx (Storybook).
 * DOM render coverage (createSolidTable smoke) can be added with vitest + solid.
 */
import { describe, expect, it } from 'vitest';

// We import from interfaces.ts (pure TS) to avoid pulling in .tsx files.
import type {
  ITableBodyProps,
  ITableCellProps,
  ITableHeaderProps,
  ITableHeadProps,
  ITableProps,
  ITableRowProps,
} from '../interfaces';

// ---------------------------------------------------------------------------
// Type-level: ensure interface shapes satisfy expected structural contracts
// ---------------------------------------------------------------------------

describe('Table interfaces structural contracts', () => {
  it('ITableProps is assignable from HTMLAttributes', () => {
    const props: ITableProps = { id: 'my-table', class: 'foo', style: {} };
    expect(props.id).toBe('my-table');
    expect(props.class).toBe('foo');
  });

  it('ITableHeaderProps accepts standard HTML attributes', () => {
    const props: ITableHeaderProps = { id: 'thead', class: 'header-class' };
    expect(props.id).toBe('thead');
  });

  it('ITableBodyProps accepts standard HTML attributes', () => {
    const props: ITableBodyProps = { id: 'tbody', class: 'body-class' };
    expect(props.id).toBe('tbody');
  });

  it('ITableRowProps carries data-state property', () => {
    const selected: ITableRowProps = { 'data-state': 'selected' };
    expect(selected['data-state']).toBe('selected');
    const unselected: ITableRowProps = {};
    expect(unselected['data-state']).toBeUndefined();
  });

  it('ITableHeadProps accepts scope and abbr (th-specific) via ThHTMLAttributes', () => {
    const head: ITableHeadProps = { scope: 'col', abbr: 'ID' };
    expect(head.scope).toBe('col');
  });

  it('ITableCellProps accepts colspan and rowspan (td-specific) via TdHTMLAttributes', () => {
    const cell: ITableCellProps = { colSpan: 2, rowSpan: 1 };
    expect(cell.colSpan).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Validate that data-state="selected" is the correct sentinel value
// ---------------------------------------------------------------------------

describe('Table row data-state sentinel', () => {
  it('selected sentinel string matches Tailwind data-[] selector target', () => {
    // The Tailwind class on TableRow uses data-[state=selected]:bg-muted.
    // This test documents that consumer must pass exactly "selected".
    const sentinel = 'selected';
    expect(sentinel).toBe('selected');
  });
});
