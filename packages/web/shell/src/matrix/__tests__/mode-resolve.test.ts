/**
 * Unit tests for createMatrixModes — mode prop sugar + precedence.
 *
 * Precedence (highest → lowest):
 *   1. Granular `resize` / `dnd` props.
 *   2. `mode` prop ('view' → both off, 'edit' → both on).
 *   3. Global signals (both false in jsdom / matchMedia mock).
 *
 * Note: global signals useResizeMode() / useDndMode() always return false in
 * this test environment (matchMedia stub returns matches:false → signals init
 * to false and there is no toggle in tests). This lets us verify that mode and
 * granular props override the global false baseline.
 */
import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createMatrixModes } from '../mode';

// ---------------------------------------------------------------------------
// Helper: run createMatrixModes inside a reactive root and read results once.
// ---------------------------------------------------------------------------
function resolve(opts: Parameters<typeof createMatrixModes>[0]) {
  return createRoot((dispose) => {
    const modes = createMatrixModes(opts);
    const result = {
      resizeEnabled: modes.resizeEnabled(),
      dndEnabled: modes.dndEnabled(),
      dndKind: modes.dndKind(),
    };
    dispose();
    return result;
  });
}

// ---------------------------------------------------------------------------
// mode="view" — both axes locked OFF
// ---------------------------------------------------------------------------

describe('mode="view"', () => {
  it('resizeEnabled is false', () => {
    expect(resolve({ resize: undefined, dnd: undefined, mode: 'view' }).resizeEnabled).toBe(false);
  });

  it('dndEnabled is false', () => {
    expect(resolve({ resize: undefined, dnd: undefined, mode: 'view' }).dndEnabled).toBe(false);
  });

  it('dndKind defaults to swap', () => {
    expect(resolve({ resize: undefined, dnd: undefined, mode: 'view' }).dndKind).toBe('swap');
  });
});

// ---------------------------------------------------------------------------
// mode="edit" — both axes locked ON
// ---------------------------------------------------------------------------

describe('mode="edit"', () => {
  it('resizeEnabled is true', () => {
    expect(resolve({ resize: undefined, dnd: undefined, mode: 'edit' }).resizeEnabled).toBe(true);
  });

  it('dndEnabled is true', () => {
    expect(resolve({ resize: undefined, dnd: undefined, mode: 'edit' }).dndEnabled).toBe(true);
  });

  it('dndKind defaults to swap', () => {
    expect(resolve({ resize: undefined, dnd: undefined, mode: 'edit' }).dndKind).toBe('swap');
  });
});

// ---------------------------------------------------------------------------
// Granular override wins over mode (precedence rule 1 > 2)
// ---------------------------------------------------------------------------

describe('granular props override mode', () => {
  it('mode="edit" + resize={false} → resizeEnabled=false, dndEnabled=true', () => {
    const r = resolve({ resize: false, dnd: undefined, mode: 'edit' });
    expect(r.resizeEnabled).toBe(false);
    expect(r.dndEnabled).toBe(true);
  });

  it('mode="edit" + dnd={false} → resizeEnabled=true, dndEnabled=false', () => {
    const r = resolve({ resize: undefined, dnd: false, mode: 'edit' });
    expect(r.resizeEnabled).toBe(true);
    expect(r.dndEnabled).toBe(false);
  });

  it('mode="view" + resize={true} → resizeEnabled=true, dndEnabled=false', () => {
    const r = resolve({ resize: true, dnd: undefined, mode: 'view' });
    expect(r.resizeEnabled).toBe(true);
    expect(r.dndEnabled).toBe(false);
  });

  it('mode="view" + dnd="swap" → resizeEnabled=false, dndEnabled=true, kind=swap', () => {
    const r = resolve({ resize: undefined, dnd: 'swap', mode: 'view' });
    expect(r.resizeEnabled).toBe(false);
    expect(r.dndEnabled).toBe(true);
    expect(r.dndKind).toBe('swap');
  });

  it('mode="view" + dnd="insert" → dndEnabled=true, kind=insert', () => {
    const r = resolve({ resize: undefined, dnd: 'insert', mode: 'view' });
    expect(r.dndEnabled).toBe(true);
    expect(r.dndKind).toBe('insert');
  });
});

// ---------------------------------------------------------------------------
// No mode → follows global / granular props as before.
//
// Global defaults in jsdom: both signals init to `true` because
// localStorage is empty → localStorage.getItem(key) !== 'false' → true.
// ---------------------------------------------------------------------------

describe('no mode — existing behaviour preserved', () => {
  it('all undefined → follows global (true in jsdom — localStorage empty → default on)', () => {
    const r = resolve({ resize: undefined, dnd: undefined, mode: undefined });
    // useResizeMode / useDndMode default to true (no stored 'false' value)
    expect(r.resizeEnabled).toBe(true);
    expect(r.dndEnabled).toBe(true);
    expect(r.dndKind).toBe('swap');
  });

  it('resize={true}, no mode → resizeEnabled=true regardless of global', () => {
    const r = resolve({ resize: true, dnd: undefined, mode: undefined });
    expect(r.resizeEnabled).toBe(true);
  });

  it('resize={false}, no mode → resizeEnabled=false', () => {
    const r = resolve({ resize: false, dnd: undefined, mode: undefined });
    expect(r.resizeEnabled).toBe(false);
  });

  it('dnd="swap", no mode → dndEnabled=true, kind=swap', () => {
    const r = resolve({ resize: undefined, dnd: 'swap', mode: undefined });
    expect(r.dndEnabled).toBe(true);
    expect(r.dndKind).toBe('swap');
  });

  it('dnd="insert", no mode → dndEnabled=true, kind=insert', () => {
    const r = resolve({ resize: undefined, dnd: 'insert', mode: undefined });
    expect(r.dndEnabled).toBe(true);
    expect(r.dndKind).toBe('insert');
  });

  it('dnd={false}, no mode → dndEnabled=false', () => {
    const r = resolve({ resize: undefined, dnd: false, mode: undefined });
    expect(r.dndEnabled).toBe(false);
  });
});
