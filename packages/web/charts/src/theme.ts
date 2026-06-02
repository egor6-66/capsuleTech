import { type Accessor, createSignal, onCleanup, onMount } from 'solid-js';

/**
 * Resolved chart colors pulled from the active `@capsuletech/web-style` theme.
 * Concrete strings (oklch / hex / …), ready to hand to Chart.js — NOT `var(--x)`
 * (canvas can't resolve CSS variables).
 */
export interface IChartTheme {
  foreground: string;
  mutedForeground: string;
  border: string;
  card: string;
  primary: string;
  destructive: string;
  /** Categorical palette from the theme `--chart-1..5` tokens. */
  palette: string[];
}

/** Neutral fallback when theme tokens are unavailable (SSR / no theme CSS). */
const FALLBACK: IChartTheme = {
  foreground: '#e5e7eb',
  mutedForeground: '#9ca3af',
  border: '#27272a',
  card: '#18181b',
  primary: '#3b82f6',
  destructive: '#ef4444',
  palette: ['#f59e0b', '#3b82f6', '#a1a1aa', '#52525b', '#71717a'],
};

const readVar = (name: string): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/**
 * Wrap a CSS color with alpha — canvas-safe via `color-mix` (Chromium 111+ /
 * WebView2 evergreen). Used for gradient fills and translucent gauge tracks.
 */
export const withAlpha = (color: string, alpha: number): string => {
  const pct = Math.max(0, Math.min(100, Math.round(alpha * 100)));
  return `color-mix(in oklab, ${color} ${pct}%, transparent)`;
};

/** Read all chart tokens off the live computed style of `<html>`. */
const readTheme = (): IChartTheme => {
  const palette = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']
    .map(readVar)
    .filter(Boolean);
  const pick = (name: string, fb: string): string => readVar(name) || fb;
  return {
    foreground: pick('--foreground', FALLBACK.foreground),
    mutedForeground: pick('--muted-foreground', FALLBACK.mutedForeground),
    border: pick('--border', FALLBACK.border),
    card: pick('--card', FALLBACK.card),
    primary: pick('--primary', FALLBACK.primary),
    destructive: pick('--destructive', FALLBACK.destructive),
    palette: palette.length ? palette : FALLBACK.palette,
  };
};

/**
 * Reactive resolved chart theme from the active web-style theme. Recomputes only
 * on actual theme / dark-mode / editor change — not per data frame — so live
 * charts stay cheap.
 *
 * Why a MutationObserver and not web-style's `useDarkMode()` / `useTheme()`:
 * web-style flips those SIGNALS and sets `data-theme` / `.dark` on `<html>`, but
 * a memo keyed on the signal runs *before* the attribute is applied, so
 * `getComputedStyle` returned the PREVIOUS theme's tokens — charts lagged one
 * theme behind (e.g. blue under a purple theme). Observing the `<html>` attribute
 * itself reads tokens only once the new theme's CSS is live → colors always match.
 */
export const useChartTheme = (): Accessor<IChartTheme> => {
  const [tokens, setTokens] = createSignal<IChartTheme>(readTheme());
  onMount(() => {
    const refresh = (): void => setTokens(readTheme());
    refresh(); // tokens may not have been ready at component-body eval time
    if (typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(refresh);
    // `data-theme` + `.dark` = theme/mode switch; `style` = live ThemeEditor edits.
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    onCleanup(() => obs.disconnect());
  });
  return tokens;
};

/** Resolve a series color: explicit value, else palette by index (wrapping). */
export const seriesColor = (
  theme: IChartTheme,
  explicit: string | undefined,
  index: number,
): string => explicit ?? theme.palette[index % theme.palette.length] ?? FALLBACK.primary;
