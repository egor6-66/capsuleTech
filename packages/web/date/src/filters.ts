import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
} from 'date-fns';
import { normalizeDate } from './format';
import type { DateInput, DateRange, IRangeOptions, RangePreset } from './types';

/** Default English labels — apps localize via `@capsuletech/web-intl` if needed. */
const PRESET_LABELS: Record<RangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7days: 'Last 7 days',
  last30days: 'Last 30 days',
  thisWeek: 'This week',
  lastWeek: 'Last week',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisQuarter: 'This quarter',
  lastQuarter: 'Last quarter',
  thisYear: 'This year',
};

/** Stable preset order for dropdowns / segmented controls. */
const PRESET_ORDER: RangePreset[] = [
  'today',
  'yesterday',
  'last7days',
  'last30days',
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
  'thisQuarter',
  'lastQuarter',
  'thisYear',
];

const isRange = (value: RangePreset | DateRange): value is DateRange =>
  typeof value === 'object' && 'from' in value && 'to' in value;

/**
 * Resolve a preset (or a custom `{ from, to }`) into a concrete inclusive
 * `[from, to]` interval. Custom ranges are returned as-is (with normalized bounds).
 */
export const range = (preset: RangePreset | DateRange, opts: IRangeOptions = {}): DateRange => {
  if (isRange(preset)) return { from: preset.from, to: preset.to };

  const now = opts.now ?? new Date();
  const weekOpt = opts.weekStartsOn !== undefined ? { weekStartsOn: opts.weekStartsOn } : undefined;

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const d = subDays(now, 1);
      return { from: startOfDay(d), to: endOfDay(d) };
    }
    case 'last7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'thisWeek':
      return { from: startOfWeek(now, weekOpt), to: endOfWeek(now, weekOpt) };
    case 'lastWeek': {
      const d = subWeeks(now, 1);
      return { from: startOfWeek(d, weekOpt), to: endOfWeek(d, weekOpt) };
    }
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': {
      const d = subMonths(now, 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    }
    case 'thisQuarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'lastQuarter': {
      const d = subQuarters(now, 1);
      return { from: startOfQuarter(d), to: endOfQuarter(d) };
    }
    case 'thisYear':
      return { from: startOfYear(now), to: endOfYear(now) };
  }
};

/** `true` if `value` falls within the inclusive range. Unparseable input → `false`. */
export const inRange = (value: DateInput, r: DateRange): boolean => {
  const date = normalizeDate(value);
  if (!date) return false;
  return isWithinInterval(date, { start: r.from, end: r.to });
};

/** Ordered preset descriptors ready to feed a dropdown / segmented filter. */
export const rangePresets = (): { id: RangePreset; label: string }[] =>
  PRESET_ORDER.map((id) => ({ id, label: PRESET_LABELS[id] }));
