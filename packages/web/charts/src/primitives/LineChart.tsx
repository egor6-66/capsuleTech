import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import { Line } from 'solid-chartjs';
import { createMemo, type JSX, mergeProps, onMount } from 'solid-js';
import { registerCharts } from '../register';
import { seriesColor, useChartTheme, withAlpha } from '../theme';

export interface ILineSeries {
  /** Legend label. */
  label?: string;
  /** Y values aligned to `labels` (`null` = gap). */
  data: (number | null)[];
  /** Explicit line color; else theme palette by series index. */
  color?: string;
}

export interface ILineChartProps {
  /** X-axis category labels. */
  labels: (string | number)[];
  /** One or more series. */
  series: ILineSeries[];
  /** Fill under the line with a vertical theme gradient. Default `false`. */
  area?: boolean;
  /** Sparkline mode — hide axes, grid, legend, points, tooltip. */
  sparkline?: boolean;
  /** Curve smoothing 0..1. Default `0.35`. */
  tension?: number;
  /** Show legend (ignored when `sparkline`). Default `series.length > 1`. */
  legend?: boolean;
  /** Pin the value-axis minimum (e.g. `0` for percentages — stops live jitter). */
  min?: number;
  /** Pin the value-axis maximum (e.g. `100` for percentages). */
  max?: number;
  /**
   * Animate transitions. Default `true`. Set `false` for live/streaming data —
   * each update otherwise tweens, and at sub-second cadence the tweens overlap
   * into constant jitter.
   */
  animate?: boolean;
  /** Container classes — sizing lives here (give it a height). */
  class?: string;
  /** Raw Chart.js options, shallow-merged over the themed defaults. */
  options?: ChartOptions<'line'>;
}

/**
 * Themed line / area chart (ADR 028). Spark-trends and time-series under
 * web-style tokens. Updates in place when `series` / `labels` change (new object
 * ref → solid-chartjs `chart.update()`), so it's cheap for live monitoring.
 */
export const LineChart = (props: ILineChartProps): JSX.Element => {
  onMount(registerCharts);
  const theme = useChartTheme();
  const local = mergeProps({ area: false, sparkline: false, tension: 0.35, animate: true }, props);

  const data = createMemo<ChartData<'line'>>(() => {
    const t = theme();
    return {
      labels: local.labels,
      datasets: local.series.map((s, i) => {
        const color = seriesColor(t, s.color, i);
        return {
          label: s.label,
          data: s.data as number[],
          borderColor: color,
          borderWidth: 2,
          tension: local.tension,
          pointRadius: local.sparkline ? 0 : 2,
          pointHoverRadius: local.sparkline ? 0 : 4,
          pointBackgroundColor: color,
          fill: local.area ? 'origin' : false,
          backgroundColor: local.area
            ? (ctx: ScriptableContext<'line'>) => {
                const { chart } = ctx;
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return withAlpha(color, 0.2);
                const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, withAlpha(color, 0.35));
                g.addColorStop(1, withAlpha(color, 0));
                return g;
              }
            : withAlpha(color, 0.2),
        };
      }),
    };
  });

  const options = createMemo<ChartOptions<'line'>>(() => {
    const t = theme();
    const showAxes = !local.sparkline;
    const showLegend = !local.sparkline && (local.legend ?? local.series.length > 1);
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: local.animate === false ? false : undefined,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          align: 'end',
          labels: {
            color: t.mutedForeground,
            usePointStyle: true,
            boxWidth: 8,
            font: { size: 11 },
          },
        },
        tooltip: {
          enabled: !local.sparkline,
          backgroundColor: t.card,
          titleColor: t.foreground,
          bodyColor: t.mutedForeground,
          borderColor: t.border,
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          display: showAxes,
          grid: { display: false },
          border: { color: t.border },
          ticks: { color: t.mutedForeground, maxRotation: 0, font: { size: 10 } },
        },
        y: {
          display: showAxes,
          min: local.min,
          max: local.max,
          grid: { color: withAlpha(t.border, 0.5) },
          border: { display: false },
          ticks: { color: t.mutedForeground, font: { size: 10 } },
        },
      },
      ...local.options,
    } as ChartOptions<'line'>;
  });

  // The canvas is taken OUT OF FLOW (absolute, inset:0) inside a definite-size
  // relative wrapper. With `responsive + maintainAspectRatio:false`, a normal-flow
  // canvas drives its parent's height → Chart.js resizes it → unbounded growth.
  // Out-of-flow breaks that loop; the wrapper's height comes only from `class`.
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }} class={local.class}>
      <div style={{ position: 'absolute', inset: '0' }}>
        <Line data={data() as unknown as ChartData} options={options() as ChartOptions} />
      </div>
    </div>
  );
};

/** Area variant — `LineChart` with `area` enabled. */
export const AreaChart = (props: ILineChartProps): JSX.Element => <LineChart area {...props} />;

export default LineChart;
