import type { Locale } from 'date-fns';

/** Anything the package accepts as a date: a `Date`, an ISO/parseable string, or an epoch-ms number. */
export type DateInput = Date | string | number;

/**
 * Named output formats. Locale-aware tokens (`P`/`p`) follow the active locale,
 * so the same name renders `09.06.2026` (ru) or `06/09/2026` (en-US).
 */
export type DateFormatName =
  | 'date.short' // localized short date (P)
  | 'date.long' // localized long date (PPP)
  | 'date.numeric' // fixed dd.MM.yyyy
  | 'time' // localized time (p)
  | 'datetime' // localized date + time (Pp)
  | 'relative' // "2 hours ago" / "через 3 дня"
  | 'iso'; // 2026-06-09T14:30:00+03:00

export interface IFormatOptions {
  /** Override the active locale for this call (date-fns `Locale`). */
  locale?: Locale;
  /** Reference point for `relative` / parsing. Defaults to `new Date()`. */
  now?: Date;
}

/** First day of the week, `0` = Sunday … `6` = Saturday. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear';

/** A closed `[from, to]` interval. Both bounds are inclusive. */
export interface DateRange {
  from: Date;
  to: Date;
}

export interface IRangeOptions {
  /** "Now" anchor the preset is computed against. Defaults to `new Date()`. */
  now?: Date;
  /** Week start for week-based presets. Defaults to the active locale's week start. */
  weekStartsOn?: WeekDay;
}
