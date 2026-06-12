// Chart namespace (augmentation-ready per ADR 046 Decision 5).
// Kit provides Ui.Chart.Basic (light placeholder). boost-chart augments
// the namespace with Line, Bar, Pie, Area, Gauge, Heatmap etc.

import { Chart as ChartBasic } from './chart';

export const Chart = {
  Basic: ChartBasic,
};

export type * from './interfaces';
