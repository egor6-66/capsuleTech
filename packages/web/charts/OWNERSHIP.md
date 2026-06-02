# OWNERSHIP — `@capsuletech/web-charts`

Owner: **owner-web-charts** (architect = initial owner). См. ADR 028.

## Что это

Themed Chart.js wrapper для capsule. Примитивы: `LineChart` / `AreaChart` / `BarChart` / `Doughnut` / `Gauge`. Под капотом `solid-chartjs` + `chart.js` (вшит в bundle). Тематизируется через CSS-токены web-style. Релизится в группе `web_base` (fixed, tag `web@{version}`).

Регистрируется в app-`Ui` как `Ui.Chart.*` (lazy) — это делает web-core ui-kit (см. ADR 028).

## Публичный API

`LineChart`, `AreaChart` (props `ILineChartProps`: `labels`, `series`, `area`, `sparkline`, `tension`, `legend`, `min`, `max`, `animate`, `class`, `options`), `BarChart` (`IBarChartProps`: + `horizontal`, `stacked`, `radius`, `min`, `max`, `animate`), `Doughnut` (`IDoughnutProps`), `Gauge` (`IGaugeProps`: `value`, `max`, `unit`, `thickness`, `semicircle`, `color`, `animate`). Плюс `useChartTheme`, `seriesColor`, `withAlpha`, `registerCharts`, `IChartTheme`.

## Грабли (session 2026-06-02)

1. **Runaway canvas growth.** `responsive: true` + `maintainAspectRatio: false` + контейнер, чья высота зависит от канваса → петля обратной связи (canvas → высота контейнера → resize canvas → …) → канвас раздувается до тысяч px → фриз. **FIX (done):** канвас вынесен ИЗ потока — `<div relative overflow-hidden class={...}><div absolute inset-0>{<Chart/>}</div></div>`. Внешний контейнер берёт definite-height из `class`; absolute-канвас не может толкать layout. Применено во всех 5 примитивах.
2. **Палитра отстаёт на одну тему.** Читать токены через `getComputedStyle`, завязав мемо на web-style **сигнал** (`useTheme`/`useDarkMode`), нельзя: сигнал флипается ДО того, как `data-theme`/`.dark` применятся к `<html>` → читались токены ПРЕДЫДУЩЕЙ темы. **FIX (done):** `useChartTheme` слушает `MutationObserver` на `document.documentElement` (`data-theme`/`class`/`style`) и перечитывает токены по факту смены атрибута (источник правды — DOM, не сигнал).
3. **Живые графики дёргаются / прыгают от начала.** Каждый `chart.update()` ре-анимирует с нуля; ось авто-рескейлится; меняющаяся длина серии ломает morph. **FIX:** окно **константной длины** (left-pad `null`-ами в потребителе), `animate={false}` на live-чартах, фикс оси `min/max` (0–100 для %).
4. **`var(--token)` не резолвится на канвасе.** Chart.js рисует на `<canvas>`, CSS-переменные там не работают. Токены резолвим в конкретные строки (`getComputedStyle` в `theme.ts`) ПЕРЕД передачей в Chart.js. Никогда не передавай `var(...)` в `series.color`/`options`.
5. **`(): void => setTokens(...)` — TS-ошибка.** Solid `Setter` возвращает значение; concise-arrow с явным `: void` ловит `TS2322`. Пиши блок-тело `(): void => { setTokens(...); }`.

> Кросс-пакетная грабля «новый пакет → пересобрать vite-builder + рестарт dev» — в корневом `CLAUDE.md` (секция Aliasing).

## Тесты

TODO — пока без unit-тестов. При добавлении: theme-resolution (mock getComputedStyle), data-mapping (series→ChartData), смоук рендера.
