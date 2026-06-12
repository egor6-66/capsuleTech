import { describe, expect, it } from 'vitest';
import { inRange, range, rangePresets } from '../filters';

// Tuesday 2026-06-09T14:30:00 local time.
const NOW = new Date(2026, 5, 9, 14, 30, 0);
const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
  new Date(y, m, d, h, min, s, ms);

describe('range presets', () => {
  it('today spans start..end of day', () => {
    const r = range('today', { now: NOW });
    expect(r.from).toEqual(at(2026, 5, 9, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 5, 9, 23, 59, 59, 999));
  });

  it('yesterday is the previous full day', () => {
    const r = range('yesterday', { now: NOW });
    expect(r.from).toEqual(at(2026, 5, 8, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 5, 8, 23, 59, 59, 999));
  });

  it('last7days is inclusive of today (6 days back)', () => {
    const r = range('last7days', { now: NOW });
    expect(r.from).toEqual(at(2026, 5, 3, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 5, 9, 23, 59, 59, 999));
  });

  it('last30days goes 29 days back', () => {
    const r = range('last30days', { now: NOW });
    expect(r.from).toEqual(at(2026, 4, 11, 0, 0, 0, 0));
  });

  it('thisWeek honors weekStartsOn=1 (Monday)', () => {
    const r = range('thisWeek', { now: NOW, weekStartsOn: 1 });
    expect(r.from).toEqual(at(2026, 5, 8, 0, 0, 0, 0)); // Monday
    expect(r.to).toEqual(at(2026, 5, 14, 23, 59, 59, 999)); // Sunday
  });

  it('lastWeek is the prior Monday..Sunday with weekStartsOn=1', () => {
    const r = range('lastWeek', { now: NOW, weekStartsOn: 1 });
    expect(r.from).toEqual(at(2026, 5, 1, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 5, 7, 23, 59, 59, 999));
  });

  it('thisMonth spans the whole month', () => {
    const r = range('thisMonth', { now: NOW });
    expect(r.from).toEqual(at(2026, 5, 1, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 5, 30, 23, 59, 59, 999));
  });

  it('lastMonth spans May 2026', () => {
    const r = range('lastMonth', { now: NOW });
    expect(r.from).toEqual(at(2026, 4, 1, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 4, 31, 23, 59, 59, 999));
  });

  it('thisQuarter is Apr..Jun for June', () => {
    const r = range('thisQuarter', { now: NOW });
    expect(r.from).toEqual(at(2026, 3, 1, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 5, 30, 23, 59, 59, 999));
  });

  it('thisYear is Jan..Dec', () => {
    const r = range('thisYear', { now: NOW });
    expect(r.from).toEqual(at(2026, 0, 1, 0, 0, 0, 0));
    expect(r.to).toEqual(at(2026, 11, 31, 23, 59, 59, 999));
  });

  it('passes a custom range through unchanged', () => {
    const custom = { from: at(2026, 0, 1), to: at(2026, 0, 31) };
    expect(range(custom)).toEqual(custom);
  });
});

describe('inRange', () => {
  const r = range('thisMonth', { now: NOW });

  it('is inclusive of both bounds', () => {
    expect(inRange(r.from, r)).toBe(true);
    expect(inRange(r.to, r)).toBe(true);
  });

  it('accepts any DateInput', () => {
    expect(inRange('2026-06-15T10:00:00', r)).toBe(true);
    expect(inRange(at(2026, 5, 15).getTime(), r)).toBe(true);
  });

  it('rejects out-of-range and invalid values', () => {
    expect(inRange(at(2026, 6, 1), r)).toBe(false);
    expect(inRange('garbage', r)).toBe(false);
  });
});

describe('rangePresets', () => {
  it('returns ordered id/label descriptors', () => {
    const presets = rangePresets();
    expect(presets[0]).toEqual({ id: 'today', label: 'Today' });
    expect(presets.map((p) => p.id)).toContain('thisQuarter');
    expect(presets).toHaveLength(11);
  });
});
