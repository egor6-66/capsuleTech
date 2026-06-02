import type { ChartData, ChartOptions } from 'chart.js';
import { Doughnut as SolidDoughnut } from 'solid-chartjs';
import { createMemo, type JSX, mergeProps, onMount, Show } from 'solid-js';
import { registerCharts } from '../register';
import { useChartTheme, withAlpha } from '../theme';

export interface IGaugeProps {
  /** Current value. */
  value: number;
  /** Scale max. Default `100`. */
  max?: number;
  /** Center label under the percentage. */
  label?: string;
  /** Unit suffix on the center value. Default `'%'`. */
  unit?: string;
  /** Arc color; else theme `primary`. Pass a threshold color from the caller. */
  color?: string;
  /** Ring thickness as a fraction 0..1 (= Chart.js cutout). Default `0.78`. */
  thickness?: number;
  /** Draw a 180° semicircle instead of a full ring. Default `false`. */
  semicircle?: boolean;
  /** Animate the arc. Default `true`. Set `false` for live data to avoid the
   *  arc re-sweeping from zero on every update. */
  animate?: boolean;
  /** Container classes — sizing lives here (give it a height). */
  class?: string;
}

/**
 * Themed radial gauge (ADR 028) — single value as a progress ring with the
 * percentage in the center. CPU / GPU utilization, RAM pressure. Built on a
 * doughnut (value arc + faint track); center text is a self-contained overlay
 * (inline-styled — no Tailwind dependency in the package).
 */
export const Gauge = (props: IGaugeProps): JSX.Element => {
  onMount(registerCharts);
  const theme = useChartTheme();
  const local = mergeProps(
    { max: 100, unit: '%', thickness: 0.78, semicircle: false, animate: true },
    props,
  );

  const clamped = (): number => Math.max(0, Math.min(local.max, local.value));
  const pct = (): number => Math.round((clamped() / (local.max || 1)) * 100);
  const arcColor = (): string => local.color ?? theme().primary;

  const data = createMemo<ChartData<'doughnut'>>(() => {
    const t = theme();
    const v = clamped();
    return {
      labels: ['value', 'rest'],
      datasets: [
        {
          data: [v, Math.max(0, local.max - v)],
          backgroundColor: [arcColor(), withAlpha(t.mutedForeground, 0.15)],
          borderWidth: 0,
          borderRadius: 8,
        },
      ],
    };
  });

  const options = createMemo<ChartOptions<'doughnut'>>(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: `${Math.round(local.thickness * 100)}%`,
        circumference: local.semicircle ? 180 : 360,
        rotation: local.semicircle ? -90 : 0,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: local.animate === false ? false : { duration: 500 },
      }) as ChartOptions<'doughnut'>,
  );

  // Canvas out-of-flow (absolute, inset:0) to break the responsive growth loop
  // — see LineChart for the why. The center-text overlay sits on top, also inset:0.
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }} class={local.class}>
      <div style={{ position: 'absolute', inset: '0' }}>
        <SolidDoughnut data={data() as unknown as ChartData} options={options() as ChartOptions} />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: '0',
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': local.semicircle ? 'flex-end' : 'center',
          'padding-bottom': local.semicircle ? '8%' : '0',
          gap: '2px',
          'pointer-events': 'none',
        }}
      >
        <span
          style={{
            'font-size': '1.5rem',
            'font-weight': '600',
            'font-variant-numeric': 'tabular-nums',
            'line-height': '1',
            color: theme().foreground,
          }}
        >
          {pct()}
          {local.unit}
        </span>
        <Show when={local.label}>
          <span style={{ 'font-size': '0.75rem', color: theme().mutedForeground }}>
            {local.label}
          </span>
        </Show>
      </div>
    </div>
  );
};

export default Gauge;
