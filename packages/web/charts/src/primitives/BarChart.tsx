import type { ChartData, ChartOptions } from 'chart.js';
import { Bar } from 'solid-chartjs';
import { createMemo, type JSX, mergeProps, onMount } from 'solid-js';
import { registerCharts } from '../register';
import { seriesColor, useChartTheme, withAlpha } from '../theme';

export interface IBarSeries {
  /** Legend label. */
  label?: string;
  /** Values aligned to `labels`. */
  data: (number | null)[];
  /** Explicit bar color; else theme palette by series index. */
  color?: string;
}

export interface IBarChartProps {
  /** Category labels. */
  labels: (string | number)[];
  /** One or more series (grouped, or stacked when `stacked`). */
  series: IBarSeries[];
  /** Horizontal bars (`indexAxis: 'y'`). Default `false`. */
  horizontal?: boolean;
  /** Stack datasets. Default `false`. */
  stacked?: boolean;
  /** Show legend. Default `series.length > 1`. */
  legend?: boolean;
  /** Bar corner radius (px). Default `4`. */
  radius?: number;
  /** Pin the value-axis minimum (e.g. `0` for percentages — stops live jitter). */
  min?: number;
  /** Pin the value-axis maximum (e.g. `100` for percentages). */
  max?: number;
  /** Animate transitions. Default `true`. Set `false` for live/streaming data. */
  animate?: boolean;
  /** Container classes — sizing lives here (give it a height). */
  class?: string;
  /** Raw Chart.js options, shallow-merged over the themed defaults. */
  options?: ChartOptions<'bar'>;
}

/**
 * Themed bar chart (ADR 028) — grouped or stacked, vertical or horizontal.
 * Per-core CPU, disks, network rx/tx in the host monitor.
 */
export const BarChart = (props: IBarChartProps): JSX.Element => {
  onMount(registerCharts);
  const theme = useChartTheme();
  const local = mergeProps({ horizontal: false, stacked: false, radius: 4, animate: true }, props);

  const data = createMemo<ChartData<'bar'>>(() => {
    const t = theme();
    return {
      labels: local.labels,
      datasets: local.series.map((s, i) => {
        const color = seriesColor(t, s.color, i);
        return {
          label: s.label,
          data: s.data as number[],
          backgroundColor: withAlpha(color, 0.8),
          hoverBackgroundColor: color,
          borderWidth: 0,
          borderRadius: local.radius,
          borderSkipped: false,
          maxBarThickness: 48,
        };
      }),
    };
  });

  const options = createMemo<ChartOptions<'bar'>>(() => {
    const t = theme();
    const showLegend = local.legend ?? local.series.length > 1;
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: local.animate === false ? false : undefined,
      indexAxis: local.horizontal ? 'y' : 'x',
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
          backgroundColor: t.card,
          titleColor: t.foreground,
          bodyColor: t.mutedForeground,
          borderColor: t.border,
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          stacked: local.stacked,
          grid: { display: false },
          border: { color: t.border },
          ticks: { color: t.mutedForeground, font: { size: 10 } },
        },
        y: {
          stacked: local.stacked,
          grid: { color: withAlpha(t.border, 0.5) },
          border: { display: false },
          ticks: { color: t.mutedForeground, font: { size: 10 } },
        },
      },
      ...local.options,
    } as ChartOptions<'bar'>;
  });

  // Canvas out-of-flow (absolute, inset:0) to break the responsive growth loop
  // — see LineChart for the why.
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }} class={local.class}>
      <div style={{ position: 'absolute', inset: '0' }}>
        <Bar data={data() as unknown as ChartData} options={options() as ChartOptions} />
      </div>
    </div>
  );
};

export default BarChart;
