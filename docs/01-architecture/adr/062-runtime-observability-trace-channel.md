---
tags: [observability, adr, proposed, web-profiler, tracing, debug, canon]
status: proposed
date: 2026-06-27
last_updated: 2026-06-27
---

> [!note] Status
> **Proposed** — 2026-06-27. Дизайн согласован (architect + user). Наблюдаемость жизненного цикла как **часть функционала**: trace-канал внутри `@capsuletech/web-profiler`, тогл вкл/выкл в любом режиме (dev И prod), корреляция для пошагового ретрейса. **Пилот — remote-канал** ([[060-web-remote-typed-contract-zod-artifact-and-studio-store|ADR 060]]). Реализация фундамента — отдельным PR (owner-web-profiler), инструментация узлов — следующим шагом.

# ADR 062 — Runtime observability: trace-канал в web-profiler

## Контекст {#context}

### Pain 1 — наш собственный функционал стал чёрным ящиком {#pain1}

Инцидент 2026-06-27 (remote→host канал): один клик доставлял событие на хост **дважды** (баг A) и одновременно `emit→Feature` молчал (баг B). Диагностика заняла часы **слепого** whack-a-mole: endpoint-`console.log`'и (`[host:canvas] dispatch ping`) дают лишь верхушку айсберга, а реальный путь события (канвас `emit` → forward-gate → postMessage → transport → RemoteComponent deliver → host emit → Feature handler) пришлось руками реконструировать через браузерные probe'ы. **Это наш код и наш функционал — он не имеет права быть чёрным ящиком для нас же.**

### Pain 2 — нельзя проследить путь от рождения до смерти {#pain2}

Жизненный цикл узлов (mount/init/subscribe/dispatch/forward/deliver/dispose) **не наблюдаем by design**. Невозможно ответить на элементарное «сколько `IframeTransport` создано и сколько подписчиков в его Set при одном смонтированном `Remote.View`» — а это вопрос **инициализации**, который должен быть в первых рядах любой метрики: как функционал «полетел» и как «приземлился».

### Pain 3 — границы пакетов не несут смысла {#pain3}

Owner web-remote, не имея метрик собственного узла, не смог сказать «у меня 2 подписчика на 1 компонент» — и начал **угадывать про соседний пакет** (boost-layout). Овнер должен рассуждать о СВОём узле и видеть его состояние, не выходя из зоны и не обходя чужие пакеты. Отсутствие per-node наблюдаемости размывает границы.

### Pain 4 — регресс невидим, тесты не ловят, dev ≠ prod {#pain4}

Функционал комплексный, методы не работают в вакууме: прогресс одного узла может дать регресс другого. Тесты не всегда это показывают. Часто dev работает так, prod — иначе; локально так, удалённо — иначе. Без постоянной (не дев-only) наблюдаемости с возможностью **включить логирование в любой момент в любом режиме** регресс ловится, когда уже пустил корни, а не в момент зарождения.

## Решение {#decision}

Наблюдаемость — **часть функционала**, а не дев-костыль. Дом — `@capsuletech/web-profiler` (это уже инструмент мониторинга+дебага; его roadmap **уже** содержит `web-query traces` / `web-renderer traces` — мы достраиваем задуманное, не бьём канон).

### D1 — Trace-канал в web-profiler {#D1}

Помимо pull-коллекторов перфоманса — **push-канал трейсов**. Trace-событие:

```ts
interface ITraceEvent {
  traceId: string;   // корреляция причинной цепочки (birth→death)
  node: string;      // 'remote.transport' | 'remote.component' | 'core.logic-wrapper' | …
  phase: string;     // 'ctor' | 'mount' | 'subscribe' | 'forward' | 'deliver' | 'dispose' | …
  level: 'debug' | 'info' | 'warn';
  data?: unknown;    // payload узла (counts, ids, размер Set, и т.п.)
  ts: number;
}
```

### D2 — Тонкий emit-субпатч = граница {#D2}

`@capsuletech/web-profiler/trace` — лёгкий субпатч (по образцу [[../08-system/web-core|`web-core/events`]]): `trace(node, phase, data, opts)` + `startTrace()` / `span(traceId, …)`. **No-op когда выключено / нет провайдера** → пакеты-потребители (web-remote, web-core, boost-layout) импортят лёгкий контракт, не таща весь профайлер.

Контракт = граница: **каждый овнер инструментирует свои узлы сам**, в чужие пакеты не лезет. Кросс-пакетный ретрейс — через общий `traceId` (D4), а не через чтение соседнего кода.

### D3 — Runtime-тогл, любой режим, ноль оверхеда когда off {#D3}

Включение/выключение **в любой момент в любом режиме** (dev И prod), глобально и **per-node/категория**: конфиг провайдера + runtime-API (`trace.enable('remote')` / `trace.disable(...)`). Гард **до** сборки события → когда выключено, оверхед нулевой. Это **не** дев-only: в prod канал гейтится тоглом, beacon-reporter может слать трейсы на бэкенд (диагностика «работает локально, ломается удалённо»).

### D4 — Корреляция и сквозной traceId {#D4}

`startTrace()` рождает `traceId`; каждый `span` под ним. На границе пакетов ID **прокидывается через конверт протокола**: remote кладёт `traceId` в сообщение → хост читает → вся цепочка (canvas emit → forward → transport → deliver → host emit → handler) под одним ID. В Dashboard — **пошаговый ретрейс** (waterfall по traceId).

### D5 — Отдельный ordered trace-stream, не metrics-bus {#D5}

Метрик-`MetricsBus` дедупит по значению и хранит per-metric — трейсам нужен **упорядоченный причинный лог** (ring по времени, с traceId-группировкой). Инфраструктуру bus (ring-buffer, subscribe) переиспользуем, но канал отдельный. Сток: существующие reporters (console=dev, beacon=prod/remote-ship, callback) + новая панель **«Traces»** в ProfilerDashboard (в т.ч. для студии — дебаг/оптимизация при сборке композиций там же).

### D6 — Scope: remote — пилот, дальше — везде {#D6}

Фундамент (канал + субпатч + тогл + корреляция + панель) строится **без** инструментации узлов (отдельный PR). Затем **пилот — remote-канал**: инструментируем `IframeTransport` (ctor/subscribe/deliver/dispose + `subscribers.size`), `RemoteComponent` (mount/dispose/receive), forward-путь и host-bridge. По трейсам баги A/B становятся видны **у источника**, без слепого фикса. Обкатав на remote — обобщаем на HCA-engine (logic-wrapper init/dispatch/forward/exit/dispose) и далее на все узлы.

## Последствия {#consequences}

### Положительные
- Жизненный цикл наблюдаем: birth→death трассируется по `traceId`, инициализация — в первых рядах.
- Границы самоочевидны: овнер видит здоровье своего узла, кросс-пакет — через общий ID, без залезания в соседа (снимает Pain 3).
- Не дев-only: тогл в любом режиме → ловим «dev≠prod / local≠remote» регрессы (снимает Pain 4).
- Окупается первым применением: баги A/B remote-канала видны у источника через инструментацию-пилот, а не вслепую.
- Канон: достройка собственного roadmap web-profiler, не костыль.

### Отрицательные / открытые
- Дисциплина инструментации: узлы надо реально размечать `trace()` — это работа каждого овнера в своей зоне.
- `traceId` — новое опциональное поле в конверте remote-протокола (web-remote) + проброс в host-bridge (web-core). Опциональное, back-compat.
- Оверхед когда **включено** (prod): объём трейсов; митигация — per-node тогл + level-фильтр + ring-cap + batching reporter.
- Открыто: персистентность тогла (localStorage / URL-флаг / env), формат traceId, политика сэмплинга в prod — решаем в брифе/импле.

## Валидация {#validation}

- **Пилот-критерий:** после инструментации remote баг A читается как **один `traceId` с двумя `remote.deliver`** (а не браузерными probe'ами), баг B — как `remote.deliver` без последующего `core.logic-wrapper.dispatch`. Оба видны в панели Traces.
- **Тогл:** включение/выключение `remote`-категории в рантайме в обоих режимах без перезапуска.
- **Ноль-оверхед:** когда выключено — нет аллокаций trace-событий (гард до сборки).

## Связь с другими ADR {#cross-links}

- [[060-web-remote-typed-contract-zod-artifact-and-studio-store|ADR 060]] — remote-протокол/контракт; `traceId` добавляется в конверт здесь.
- [[061-uiproxy-dynamic-ctx-event-routing|ADR 061]] — событие идёт в ближайший враппер; узлы event-flow — кандидаты на инструментацию.
- [[032-package-controllers-and-useemit|ADR 032]] — `useEmit`/dispatch — узел `core.logic-wrapper` для трейсинга.
- web-profiler OWNERSHIP roadmap (`web-query traces` / `web-renderer traces`) — этот ADR обобщает идею в первоклассный канал.
