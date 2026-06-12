import { describe, expect, it } from 'vitest';
import { formatDate, isValidDate, normalizeDate, parseDate } from '../format';

// Fixed reference: 2026-06-09T14:30:00 local time.
const REF = new Date(2026, 5, 9, 14, 30, 0);

describe('normalizeDate', () => {
  it('passes through a valid Date', () => {
    expect(normalizeDate(REF)?.getTime()).toBe(REF.getTime());
  });

  it('coerces epoch-ms numbers', () => {
    expect(normalizeDate(REF.getTime())?.getTime()).toBe(REF.getTime());
  });

  it('parses ISO strings', () => {
    expect(normalizeDate('2026-06-09T14:30:00')?.getFullYear()).toBe(2026);
  });

  it('returns null for garbage', () => {
    expect(normalizeDate('not-a-date')).toBeNull();
    expect(normalizeDate(new Date('invalid'))).toBeNull();
  });
});

describe('isValidDate', () => {
  it('accepts valid inputs', () => {
    expect(isValidDate(REF)).toBe(true);
    expect(isValidDate('2026-06-09')).toBe(true);
    expect(isValidDate(REF.getTime())).toBe(true);
  });

  it('rejects nullish, objects and bad strings', () => {
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate({})).toBe(false);
    expect(isValidDate('nope')).toBe(false);
  });
});

describe('formatDate', () => {
  it('renders the fixed numeric format', () => {
    expect(formatDate(REF, 'date.numeric')).toBe('09.06.2026');
  });

  it('renders localized short/long with the default en-US locale', () => {
    expect(formatDate(REF, 'date.short')).toBe('06/09/2026');
    expect(formatDate(REF, 'date.long')).toBe('June 9th, 2026');
  });

  it('renders an ISO string', () => {
    expect(formatDate(REF, 'iso')).toMatch(/^2026-06-09T14:30:00/);
  });

  it('renders a relative string with suffix', () => {
    const past = new Date(REF.getTime() - 2 * 60 * 60 * 1000);
    expect(formatDate(past, 'relative', { now: REF })).toContain('ago');
  });

  it('returns empty string for invalid input', () => {
    expect(formatDate('garbage', 'date.short')).toBe('');
  });
});

describe('parseDate', () => {
  it('parses by a concrete named format', () => {
    const d = parseDate('09.06.2026', 'date.numeric');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(9);
  });

  it('passes Date and number through', () => {
    expect(parseDate(REF)?.getTime()).toBe(REF.getTime());
    expect(parseDate(REF.getTime())?.getTime()).toBe(REF.getTime());
  });

  it('falls back to best-effort for ISO / no name', () => {
    expect(parseDate('2026-06-09T14:30:00')?.getFullYear()).toBe(2026);
  });

  it('returns null for unparseable strings', () => {
    expect(parseDate('garbage', 'date.numeric')).toBeNull();
  });
});
