# @capsuletech/web-charts

Themed Chart.js wrapper для capsule: `LineChart` / `AreaChart` / `BarChart` / `Doughnut` / `Gauge`.  ·  zone: **boost**  ·  status: **alpha (0.1.1)**

Под капотом `solid-chartjs` + `chart.js`. Тематизируется через CSS-токены `@capsuletech/web-style`. Light-mirror — `Ui.Chart` placeholder в kit (после Phase B6-placeholder).

> **Будет переименован в `@capsuletech/boost-chart`** в Phase W6 ([[web-rework-plan]] / ADR 046 D1).

## Install

```bash
pnpm add @capsuletech/web-charts
# peer deps:
pnpm add solid-js @capsuletech/web-style
```

## Minimum usage

```tsx
import { LineChart } from '@capsuletech/web-charts';

const data = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr'],
  datasets: [{ label: 'Visits', data: [100, 240, 180, 320] }],
};

<LineChart data={data} options={{ responsive: true }} />;
```

В capsule-аппе chart-примитивы доступны как `Ui.Chart.Line` / `Ui.Chart.Bar` / ... через web-core ui-kit registry (ADR 028).

## Stack

- [Chart.js 4](https://www.chartjs.org/) — main engine.
- [solid-chartjs](https://github.com/solid-chartjs/solid-chartjs) — Solid wrapper.

## Docs

- AI-anchor: [`docs/_meta/web-charts.md`](../../../docs/_meta/web-charts.md) _(TBD)_
- Zone canon: [`docs/_meta/web-zones/boost.md`](../../../docs/_meta/web-zones/boost.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 028 (web-charts Chart.js wrapper), ADR 044 (heavy=pkg / light=kit), ADR 046 D1 (boost-* namespace).
