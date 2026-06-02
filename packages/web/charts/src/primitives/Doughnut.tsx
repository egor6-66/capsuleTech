import type { ChartData, ChartOptions } from 'chart.js';
import { Doughnut as SolidDoughnut } from 'solid-chartjs';
import { createMemo, type JSX, mergeProps, onMount } from 'solid-js';
import { registerCharts } from '../register';
import { seriesColor, useChartTheme } from '../theme';

export interface IDoughnutSlice {
  /** Slice label (legend + tooltip). */
  label: string;
  /** Slice value (relative — Chart.js normalizes). */
  value: number;
  /** Explicit slice color; else theme palette by index. */
  color?: string;
}

export interface IDoughnutProps {
  /** Slices to draw. */
  slices: IDoughnutSlice[];
  /** Center hole as a fraction 0..1. Default `0.6`. */
  cutout?: number;
  /** Show legend. Default `true`. */
  legend?: boolean;
  /** Container classes — sizing lives here (give it a height). */
  class?: string;
  /** Raw Chart.js options, shallow-merged over the themed defaults. */
  options?: ChartOptions<'doughnut'>;
}

/**
 * Themed doughnut (ADR 028) — part-of-whole breakdowns (RAM vs swap, VRAM
 * used/free). For a single-value progress ring use `Gauge`.
 */
export const Doughnut = (props: IDoughnutProps): JSX.Element => {
  onMount(registerCharts);
  const theme = useChartTheme();
  const local = mergeProps({ cutout: 0.6, legend: true }, props);

  const data = createMemo<ChartData<'doughnut'>>(() => {
    const t = theme();
    return {
      labels: local.slices.map((s) => s.label),
      datasets: [
        {
          data: local.slices.map((s) => s.value),
          backgroundColor: local.slices.map((s, i) => seriesColor(t, s.color, i)),
          borderColor: t.card,
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  });

  const options = createMemo<ChartOptions<'doughnut'>>(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: `${Math.round(local.cutout * 100)}%`,
        plugins: {
          legend: {
            display: local.legend,
            position: 'bottom',
            labels: {
              color: theme().mutedForeground,
              usePointStyle: true,
              boxWidth: 8,
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: theme().card,
            titleColor: theme().foreground,
            bodyColor: theme().mutedForeground,
            borderColor: theme().border,
            borderWidth: 1,
          },
        },
        ...local.options,
      }) as ChartOptions<'doughnut'>,
  );

  // Canvas out-of-flow (absolute, inset:0) to break the responsive growth loop
  // — see LineChart for the why.
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }} class={local.class}>
      <div style={{ position: 'absolute', inset: '0' }}>
        <SolidDoughnut data={data() as unknown as ChartData} options={options() as ChartOptions} />
      </div>
    </div>
  );
};

export default Doughnut;
