import {
  format as fnsFormat,
  parse as fnsParse,
  formatDistance,
  formatDistanceToNow,
  formatISO,
  isValid,
  parseISO,
  toDate,
} from 'date-fns';
import { getDateLocale } from './locale';
import type { DateFormatName, DateInput, IFormatOptions } from './types';

/** date-fns pattern strings for the concrete (non-special) named formats. */
const PATTERNS: Record<Exclude<DateFormatName, 'relative' | 'iso'>, string> = {
  'date.short': 'P',
  'date.long': 'PPP',
  'date.numeric': 'dd.MM.yyyy',
  time: 'p',
  datetime: 'Pp',
};

/**
 * Coerce any {@link DateInput} into a valid `Date`, or `null` if it can't be parsed.
 * Strings are tried as ISO first, then handed to the `Date` constructor.
 */
export const normalizeDate = (input: DateInput): Date | null => {
  if (input instanceof Date) return isValid(input) ? input : null;
  if (typeof input === 'number') {
    const d = toDate(input);
    return isValid(d) ? d : null;
  }
  const iso = parseISO(input);
  if (isValid(iso)) return iso;
  const loose = new Date(input);
  return isValid(loose) ? loose : null;
};

/** `true` if `input` can be coerced into a valid date. Safe for `unknown`. */
export const isValidDate = (input: unknown): boolean => {
  if (input == null) return false;
  if (typeof input !== 'string' && typeof input !== 'number' && !(input instanceof Date)) {
    return false;
  }
  return normalizeDate(input) !== null;
};

/**
 * Format a date by named format. Returns `''` for unparseable input so callers
 * can render straight into JSX without guarding.
 */
export const formatDate = (
  input: DateInput,
  name: DateFormatName,
  opts: IFormatOptions = {},
): string => {
  const date = normalizeDate(input);
  if (!date) return '';
  const locale = opts.locale ?? getDateLocale();
  if (name === 'iso') return formatISO(date);
  if (name === 'relative') {
    // `formatDistanceToNow` always uses the real clock; honor an explicit `now`
    // anchor (deterministic, testable) via `formatDistance` when provided.
    return opts.now
      ? formatDistance(date, opts.now, { addSuffix: true, locale })
      : formatDistanceToNow(date, { addSuffix: true, locale });
  }
  return fnsFormat(date, PATTERNS[name], { locale });
};

/**
 * Parse a string back into a `Date`. With a `name` that maps to a concrete
 * pattern it parses strictly by that pattern; otherwise (or on failure) it falls
 * back to {@link normalizeDate}. `Date`/number inputs pass straight through.
 */
export const parseDate = (
  input: DateInput,
  name?: DateFormatName,
  opts: IFormatOptions = {},
): Date | null => {
  if (input instanceof Date || typeof input === 'number') return normalizeDate(input);
  if (!name || name === 'iso' || name === 'relative') return normalizeDate(input);
  const locale = opts.locale ?? getDateLocale();
  const reference = opts.now ?? new Date();
  const parsed = fnsParse(input, PATTERNS[name], reference, { locale });
  return isValid(parsed) ? parsed : normalizeDate(input);
};
