# Brief — trace-канал в web-profiler (фундамент, owner-web-profiler)

**ADR:** [[062-runtime-observability-trace-channel]]. **Зона:** `packages/web/runtime/profiler/` (scope `profiler`). Отдельный PR.

**Это только ФУНДАМЕНТ.** Инструментацию узлов (remote/web-core/boost-layout) и `traceId` в remote-протоколе в этот PR НЕ включать — следующий шаг.

## Цель
Push-канал трейсов жизненного цикла как часть профайлера: структурные события узлов + корреляция (birth→death) + рантайм-тогл в любом режиме (dev И prod) + сток в reporters/Dashboard. Окупится на пилоте (remote), но строим обобщённо.

## Что сделать

1. **Trace-событие + отдельный ordered-стрим** (`src/core/`):
   ```ts
   interface ITraceEvent { traceId: string; node: string; phase: string; level: 'debug'|'info'|'warn'; data?: unknown; ts: number; }
   ```
   - Отдельный от `MetricsBus` канал: метрики дедупят по значению, трейсам нужен **упорядоченный** причинный лог. Переиспользовать `createRingBuffer` (`src/core/ringBuffer.ts`), но стрим свой (ring по времени, группировка по `traceId`). Назвать, напр., `createTraceBus({ capacity? })` рядом с `createMetricsBus`.

2. **Module-level emit (НЕ только hook) + тонкий субпатч** `@capsuletech/web-profiler/trace`:
   - `trace(node, phase, data?, opts?)`, `startTrace(): traceId`, `span(traceId, node, phase, data?)`.
   - **Критично:** `trace()` должен зваться из НЕ-компонентного кода (класс `IframeTransport`, фабрики) — значит это **module-level функция с registered sink** (singleton-registry, который `ProfilerProvider` заполняет на маунте), а НЕ Solid-хук. `useTrace()` — опц. тонкая обёртка для компонент-скоупа.
   - **No-op когда sink не зарегистрирован ИЛИ тогл off** — гард ДО сборки события (ноль аллокаций).
   - Сборка: добавить `trace: 'src/trace/index.ts'` в `vite.config.mts` entry + `"./trace"` в `package.json` exports (по образцу лёгких субпатчей). Проверить, что субпатч лёгкий (не тянет коллекторы/Dashboard).

3. **Runtime-тогл** (любой режим, не дев-only):
   - Глобально + per-node/категория. Конфиг на `ProfilerProvider` (напр. `trace?: { enabled?, nodes?, level? }`) + runtime-API `trace.enable(category)` / `trace.disable(category)` / `trace.setLevel(...)`.
   - Гард в `trace()` проверяет тогл ПЕРВЫМ. Когда off — мгновенный return.

4. **Сток:** прокинуть trace-стрим в существующие reporters (`console`/`beacon`/`callback`) — трейсы текут в те же синки (console=dev, beacon=prod-ship на бэкенд, callback=generic). Если чисто — переиспользовать reporter-интерфейс; если нет — тонкий trace-reporter.

5. **Dashboard «Traces» панель** (`src/widget/panels/`): waterfall/timeline, **группировка по `traceId`** (пошаговый ретрейс цепочки). Регистрация вкладки в `widget/dashboard.tsx` рядом с vitals/network/errors/runtime/custom.

6. **Тесты:** emit→стрим; no-op когда off/без sink (ноль событий); тогл per-node; корреляция (события одного traceId группируются по порядку); ring-cap; субпатч-API экспортируется.

7. **OWNERSHIP.md + docs:** добавить trace-канал в публичный API + снять/обновить roadmap-пункты `web-query/web-renderer traces` (теперь обобщены в канал).

## Открытые решения (предложи в PR)
- Персистентность тогла: localStorage / URL-флаг / env — что дефолт.
- Формат `traceId` (короткий рандом; Date.now недоступен в части окружений — генерить от counter+random).
- Политика сэмплинга в prod (full / rate-limit) — можно отложить, но заложить точку.

## НЕ делать
- НЕ инструментировать узлы (remote/web-core/boost-layout) и НЕ трогать remote-протокол/`traceId` в конверте — следующий шаг, другие зоны.
- НЕ трогать apps/*, чужие пакеты.
- Push НЕ делать (commit-only; release web_base координирует architect).

## Проверка
`pnpm --filter @capsuletech/web-profiler test` + `build`. Вернуть последние строки.

---

## Вопросы owner-profiler → architect (2026-06-27)

### 🔴 БЛОКЕР (cross-package, решает architect — не моя зона): где живёт контракт `trace()`?

Чтобы `trace()` звался из НЕ-компонентного кода (`IframeTransport`, фабрики), потребители импортят его статически. Среди потребителей — **`web-core`** (host-bridge dispatch, logic-wrapper). Это создаёт import-edge **`web-core` (core-слой) → `web-profiler` (runtime-слой, zone=runtime, P2 optional)**.

- No-op-контракт снимает **runtime**-оверхед (гард до сборки), но **import-edge в package.json остаётся**: ядро начинает статически зависеть от observability-пакета. По слоям это похоже на инверсию (нижний/core тянет верхний/optional).
- Релизного риска нет — оба в fixed-группе `web_base`. Вопрос чисто слоевой/канонический.

**Развилка — где определён `ITraceEvent` + сигнатуры `trace`/`startTrace`/`span` (тонкий контракт, ~30 строк):**

- **(а)** В `@capsuletech/web-profiler/trace`, как сейчас в брифе. Просто, всё в одном месте. Минус: ребро `web-core → web-profiler`.
- **(б) ⬅ мой lean.** Тонкий контракт+registry живёт в нейтральном core-месте (по образцу `web-core/events` — отдельный лёгкий субпатх). `web-profiler` — лишь **один из sink'ов**, который регистрируется в этот registry на маунте `ProfilerProvider`. Тогда потребители (включая `web-core`) импортят контракт из core/нейтрали, а не из profiler → ребро не инвертируется.

Это решение меняет **что именно я строю** в этом PR:
- при (а) — registry+контракт+sink целиком у меня в profiler;
- при (б) — у меня остаётся trace-bus + reporters-сток + Dashboard-панель + регистрация sink'а, а сам контракт/registry — задача owner-web-core (или нейтрального пакета), это уже не мой scope.

**Прошу зафиксировать в брифе (а)/(б)** до старта — иначе рискую построить не в том пакете.

> ## ⛔ РЕЗОЛЮЦИЯ ARCHITECT (2026-06-27): вариант (а). НОВОГО ПАКЕТА НЕТ.
>
> **Факт:** `web-profiler/package.json` deps = только `web-vitals`, ни одного `@capsuletech/*`. Профайлер — **leaf**. Значит `profiler → consumer` рёбер не существует → **цикл невозможен** → прослойка (которую и предлагали только ради разрыва цикла) **не нужна**. Это cross-cutting сервис (как логгер); зависеть от него напрямую — норма. Граница = тонкий субпатх `/trace` (потребитель видит только `trace()`, не внутренности).
>
> **Строй (а):** контракт + registry + module-level emit + тогл + trace-bus + reporter + Dashboard — **целиком в web-profiler**, как в исходном брифе. Твоя зона полностью.

> **РЕЗОЛЮЦИЯ ARCHITECT (2026-06-27): вариант (а). Никакого нового пакета.**
>
> Факт, снимающий блокер: `web-profiler/package.json` deps = **только `web-vitals`**, ни одного `@capsuletech/*`. Профайлер — **leaf-сервис**, не зависит от графа. Значит:
> - **Цикла быть не может** — `profiler → core/remote/…` рёбер нет и не будет. `core → profiler` (как сейчас vitals, так и trace) — одно направление, ацикличное. То же для любого будущего потребителя (включая web-ui: profiler использует `@kobalte/core` напрямую, НЕ web-ui → даже web-ui→profiler/trace ацикличен).
> - **Это не инверсия, а cross-cutting сервис** (как логгер): от него зависят все, это норма. «Инверсия» была бы при цикле — его нет.
> - **Граница = тонкий субпатх `/trace`**, не отдельный пакет. Потребитель видит только `trace()`-сигнатуру, не внутренности → корней в профайлер не пускает. Контракт+registry+sink — **целиком у тебя в profiler**, как в исходном брифе.
>
> Прослойка нужна была бы только чтобы разорвать цикл — а его физически нет. Строй (а).

### 🟡 Уточнения (моя зона — решу сам, фиксирую чтобы не было сюрприза в PR)

1. **Reporter-интерфейс под трейсы.** Существующие reporters (`callback`/`console`/`beacon`) подписаны на `IMetricsBus` и эмиттят `(id, sample, meta)` — это **metric-shape**, не `ITraceEvent`. Чистого reuse «как есть» не будет. Мой план: тонкий **trace-reporter** поверх того же `subscribe`-паттерна (console=dev, beacon=ship, callback=generic), без ломки metric-reporter'ов. Если architect хочет именно общий generic reporter-контракт — скажи, иначе иду тонким.

2. **`ts` и `traceId` через `Date.now()` — в рантайме ОК.** Оговорка в «Открытых решениях» про «Date.now недоступен» относится к workflow-скриптам, не к браузер-рантайму пакета: `MetricsBus` уже пишет `ts: Date.now()` (`core/bus.ts:65`). Так что `ITraceEvent.ts` — `Date.now()` как у метрик. `traceId` всё равно делаю `counter+random` (коллизио-устойчивость + читаемость в waterfall), независимо от Date.

3. **Тогл persistence / sampling** — беру дефолтом из «Открытых решений», предложу в PR (склоняюсь: тогл в localStorage + URL-override `?trace=remote`; prod-сэмплинг — точка-заглушка `sampler?: (e) => boolean`, full по умолчанию). Если есть предпочтение — впиши, иначе решаю в PR.

> **ARCHITECT по 🟡 (твоя зона, подтверждаю леаны):** 1) тонкий trace-reporter — да, не форсим generic. 2) `Date.now()` для `ts` — да, прав, оговорка была про workflow-скрипты; `traceId` = counter+random. 3) тогл localStorage + `?trace=` + `sampler?`-заглушка — хорошие дефолты, бери. Сюрпризов в PR не будет.
