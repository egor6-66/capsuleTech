// @capsuletech/web-charts — themed Chart.js primitives (ADR 028).
//
// Wraps `solid-chartjs` + `chart.js` under `@capsuletech/web-style` tokens.
// Canvas-based: give every chart container a height (the primitives only pass
// `class` through and set `position: relative`). Charts update in place when
// their `series` / `labels` props change — cheap for live monitoring.

export { AreaChart, type ILineChartProps, type ILineSeries, LineChart } from './primitives/LineChart';
export { BarChart, type IBarChartProps, type IBarSeries } from './primitives/BarChart';
export { Doughnut, type IDoughnutProps, type IDoughnutSlice } from './primitives/Doughnut';
export { Gauge, type IGaugeProps } from './primitives/Gauge';

// Theme-bridge (advanced): resolve the active theme palette for custom charts.
export { type IChartTheme, seriesColor, useChartTheme, withAlpha } from './theme';

// Escape hatch: register extras + re-export Chart.js essentials so consumers can
// build bespoke charts without importing `chart.js` directly (alpha-insulation,
// same pattern as web-flow re-exporting solid-flow building blocks).
export { registerCharts } from './register';
export {
  Chart,
  type ChartData,
  type ChartOptions,
  type ChartTypeRegistry,
  type Plugin as ChartPlugin,
} from 'chart.js';
