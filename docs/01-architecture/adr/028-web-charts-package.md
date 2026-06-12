---
tags: [hca, adr, accepted]
status: canon
date: 2026-06-02
---

# ADR 028 — Чарт-примитивы `@capsuletech/web-charts` (обёртка `solid-chartjs` + Chart.js)

> [!info] Status: accepted
> Новый пакет **`@capsuletech/web-charts`** — обёртка над `solid-chartjs` (Solid-биндинг к Chart.js). Тематизированные графики (`LineChart`/`AreaChart`/`BarChart`/`Doughnut`/`Gauge`) под токены `@capsuletech/web-style`. Первый консумер — виджет мониторинга системы в `apps/nexus` (наглядный host-monitor по образцу crypto-dashboard). Реализует — главный (initial owner; будущий owner-web-charts).

## Контекст {#context}

`apps/nexus` (desktop-хаб) должен показывать **наглядный мониторинг системы** — CPU/GPU/RAM/диски/сеть/температуры — по образцу dashboard'а: stat-карточки, area-спарклайны с градиентом, радиальные/donut-гейджи, групповые бары, легенды, переключатель тайминга. Backend готов ([[023-desktop-system-metrics|ADR 023]]: Rust-команды `get_system_snapshot`/`start_monitoring`/`stop_monitoring` + событие `system://metrics` с полным `SystemSnapshot`), типы готовы (`@capsuletech/desktop/metrics`). Не хватает **графиков** — в `@capsuletech/web-ui` нет ни одного chart/gauge/sparkline-примитива.

Графики нужны не только Nexus — это сквозная потребность фреймворка (дашборды, аналитика, мониторинг). Значит, нужен **переиспользуемый chart-слой**, а не одноразовые `<canvas>` в приложении.

Выбор библиотеки: **`solid-chartjs`** (Solid-биндинг к **Chart.js**). Canvas-рендер, зрелое ядро Chart.js покрывает все типы из образца одним движком: line/area (спарклайны с градиентной заливкой), bar (групповые — per-core CPU, диски, сеть rx/tx), doughnut с `cutout` (радиальный гейдж утилизации). `solid-chartjs` — ~8k загрузок (живой биндинг), против ~200 у `@dschz/solid-uplot` / прочих самопалов. «Prefer existing libs».

## Решение {#decisions}

Новый пакет **`@capsuletech/web-charts`** — обёртка над `solid-chartjs` + `chart.js`.

> **Тематизированные chart-примитивы, которые КОМПОЗИРУЮТСЯ в Views/Widgets как обычный UI.**

**Почему отдельный пакет, а не в `@capsuletech/web-ui`:** Chart.js + solid-chartjs — тяжёлая canvas-зависимость. Втащив её в UI-kit, мы заставили бы каждое приложение тянуть Chart.js, даже без единого графика. Отдельный пакет изолирует зависимость: графики тянет только тот, кто их рендерит. (web-ui сможет ре-экспортнуть позже, если понадобится единая точка `Ui.*`.)

### Что даёт обёртка (ценность поверх голого solid-chartjs)

- **Capsule theme-bridge:** цвета линий/заливок/осей/сетки/легенды берутся из токенов `@capsuletech/web-style` (`--primary`/`--border`/`--muted-foreground`/...) и переключаются light/dark через `useDarkMode` — как `--xy-*` мост во `@capsuletech/web-flow` ([[027-web-flow-node-canvas|ADR 027]]). Консумер не возится с цветами Chart.js.
- **Sane defaults:** `responsive: true`, `maintainAspectRatio: false` (график тянется по контейнеру), скрытые оси/легенда для спарклайн-режима, градиентная заливка area из коробки.
- **Декларативный API:** типизированный `data`/`series` → готовый `<canvas>`. Консумер не регистрирует контроллеры Chart.js руками (обёртка делает `Chart.register(...)` нужных элементов один раз).
- **Изоляция зависимости:** `solid-chartjs` + `chart.js` лежат в этом пакете; приложения без графиков их не тянут.

### Набор примитивов (v1)

| Примитив | Chart.js-тип | Назначение в образце |
|---|---|---|
| `LineChart` / `AreaChart` | `line` (+`fill`/градиент) | спарклайны и история (CPU%/RAM%/GPU util во времени) |
| `BarChart` | `bar` (групповой) | per-core CPU, диски, сеть rx/tx |
| `Doughnut` | `doughnut` | распределение (RAM vs swap, VRAM used/free) |
| `Gauge` | `doughnut` + `cutout` + полукруг | радиальный гейдж утилизации (CPU/GPU %) |

Состав может расширяться (scatter/stacked/radar) по мере роста потребности — пакет для этого и заводится.

### Инфраструктура (зона главного)

- Регистрация `@capsuletech/web-charts` в `tsconfig.base.json → paths`.
- `optimizeDeps.exclude` в `capsuleConfig.ts` (workspace-пакет не пре-бандлить).
- Релиз в группе **web_base** (fixed, tag `web@{version}`).
- `solid-chartjs` + `chart.js` — runtime-deps пакета (не peer): обёртка владеет версией.

## Альтернативы {#alternatives}

| Вариант | Почему отвергнут |
|---|---|
| **Примитивы в `@capsuletech/web-ui`** | Тащит Chart.js во весь UI-kit — каждое приложение грузит canvas-движок без графиков. Отдельный пакет изолирует. (web-ui может ре-экспортнуть позже.) |
| **uPlot / самопал на canvas** | uPlot быстрый, но низкоуровневый (оси/легенды/градиенты — руками) и нишевый (~200 загрузок). Chart.js покрывает все типы образца из коробки, биндинг живой (~8k). |
| **D3 / visx-подобное** | Мощно, но это конструктор графиков, а не графики — недели на каждый тип. Нам нужны готовые line/bar/doughnut под токены. |
| **Голый `solid-chartjs` в `apps/nexus`** | Без theme-bridge каждый консумер хардкодит цвета и регистрацию Chart.js; графики не переиспользуются. Обёртка снимает это. |
| **ECharts / Recharts-порт** | ECharts тяжелее и со своей моделью; Recharts — React. Chart.js + solid-chartjs ближе к Solid-идиоме и легче. |

## Последствия {#consequences}

**Плюсы:** переиспользуемый chart-слой (Nexus + любые дашборды); тема интегрирована (light/dark автоматом); зависимость изолирована от UI-kit; обёртка прячет регистрацию Chart.js и alpha-эргономику solid-chartjs; один движок на все типы образца.

**Минусы / риски:** новый пакет + новая зависимость (`chart.js` + `solid-chartjs`) — инфра/релиз-оверхед. Chart.js — canvas (не SVG): нет per-элемент DOM для CSS-стилизации, тема прокидывается через JS-опции (мост обёртки). Тяжелее uPlot по bundle — приемлемо, т.к. тянут только консументы графиков.

## План (phase-per-PR)

1. **ADR 028** (этот).
2. **Scaffold `@capsuletech/web-charts`** (nx lib, package.json, tsconfig-path, optimizeDeps.exclude, vite build, OWNERSHIP.md + `docs/_meta/web-charts.md`). Главный (initial owner).
3. **Theme-bridge + примитивы v1** — `LineChart`/`AreaChart`, `BarChart`, `Doughnut`, `Gauge` под токены web-style (`useDarkMode`).
4. **`Segmented`** time-range toggle в `@capsuletech/web-ui` (обёртка kobalte `ToggleGroup`, single-select pills) — для переключателя тайминга.
5. **Виджет `SystemMonitor` в `apps/nexus`** — Feature (rolling-буфер 1м/5м/15м/1ч + `start_monitoring`/`stop_monitoring` через onInit/onDispose) + View (stat-карточки + графики web-charts + Segmented) + Widget; впаять в `'monitor'`-ноду `flowCanvas`.

## Связанное {#related}

- [[023-desktop-system-metrics|ADR 023]] — backend host-метрик (источник данных для Nexus-монитора)
- [[027-web-flow-node-canvas|ADR 027]] — sibling-паттерн (новый web-пакет-обёртка с theme-bridge); Flow хостит ноду-монитор
- [[web-style|web-style]] · источник токенов и `useDarkMode` для theme-bridge
- [[web-ui|web-ui]] · `Segmented` time-range toggle живёт здесь
