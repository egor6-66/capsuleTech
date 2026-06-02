import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

let done = false;

/**
 * Register every Chart.js piece web-charts primitives rely on. Idempotent —
 * safe to call from every primitive's `onMount`.
 *
 * solid-chartjs typed components self-register their *controllers* (Line →
 * LineController + scales + elements, Bar → BarController + BarElement, Doughnut
 * → DoughnutController + ArcElement). What they do NOT register — and we need —
 * is `Filler` (area fill under lines), `Tooltip` and `Legend`. We register those
 * here, plus the controllers/scales again (Chart.register dedupes by id, so the
 * overlap is harmless and guarantees a primitive works even if it mounts first).
 */
export const registerCharts = (): void => {
  if (done) return;
  Chart.register(
    LineController,
    LineElement,
    PointElement,
    BarController,
    BarElement,
    DoughnutController,
    ArcElement,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
    Legend,
  );
  done = true;
};
