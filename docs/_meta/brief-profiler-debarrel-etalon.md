# Brief — de-barrel web-profiler (ПЕРВЫЙ ЭТАЛОН канона, owner-web-profiler)

**ADR:** [[063-thin-providers-subpath-capabilities]]. **Зона:** `packages/web/runtime/profiler/` (scope `profiler`).

Это **эталон** применения канона: 1 тонкий Provider = хаб + независимые сабмодули-children. Обкатываем флоу здесь, потом аудитим остальные пакеты под него. Делать чисто.

## Модель (из ADR 063)
- **ProfilerProvider — ОДИН, тонкий, оркестратор-хаб.** Несёт ТОЛЬКО свою логику: шины (metrics+trace) + контексты + приём trace-сигналов (sink). **НЕ импортит ни одного сабмодуля** (ни коллекторов, ни Dashboard, ни reporters).
- **Сабмодули = children через контекст** (могут стоять в глубине дерева): каждый collector, Dashboard, каждый reporter/логер. Само-регистрируются через `useProfiler()`/`useTraceBus()` на маунте.
- **prop = конфиг** (capacity/historySize/trace-toggle), **сабмодуль = child** (не prop).

## Что сделать

1. **`providers/profiler.tsx` → тонкий:**
   - **Убрать** импорты 13 коллекторов + `legacyCollectors`/`allCollectors`/`resolveCollectors` + `collectors`-preset-проп.
   - **Убрать** импорт `ProfilerDashboard` + `<Show when={showDashboard}><ProfilerDashboard/></Show>`.
   - **Убрать** `reporters`-проп-инициализацию (reporters → сабмодули-children).
   - **Оставить:** `createMetricsBus` + `createTraceBus`, `registerTraceSink` (хаб ловит trace), provide `ProfilerContext` + `TraceContext`. **Config-props only:** `historySize`, `trace?` (capacity/enabled/nodes/level toggle). Ни collectors, ни reporters, ни dashboard в props.
   - Проверить: модуль провайдера импортит только bus/trace/context — НИЧЕГО тяжёлого.

2. **Collectors → сабмодуль-компоненты** (`/collectors`): обернуть каждый `ICollector` в само-регистрирующийся компонент (`const bus = useProfiler(); onMount(() => onCleanup(collector.init(bus)))`). Гранулярно (по одному → tree-shake: смонтировал `<WebVitalsCollector/>` — только он в бандле). Опц. preset-компонент `<Collectors preset="all-except-deep"/>` — это **opt-in комбо** (тянет свой набор), не дефолт.

3. **Reporters → сабмодуль-компоненты** (`/reporters`): console/beacon/callback (+ trace-reporters) как компоненты-читатели, подписываются на bus из контекста + `onCleanup(unsub)`. Потребитель монтит нужный интерфейс мониторинга.

4. **Dashboard** (`/widget`, уже компонент): просто перестать рендерить его из провайдера — потребитель монтит `<ProfilerDashboard/>` как child где угодно (в т.ч. в глубине, напр. студийная панель).

5. **Legacy `VitalsMonitoringProvider`:** он юзал `ProfilerProvider collectors="legacy"` — теперь сломается. Ретайр/переписать на новую композицию (тонкий provider + дочерние legacy-коллекторы) ИЛИ пометить к удалению (миграция консьюмера = web-core BaseProviders, парный бриф). Согласовать факт ретайра — там `BaseProviders.vitals` его потребляет.

## Эталон-критерий (ОБЯЗАТЕЛЬНО проверить и приложить к PR)
- Импорт `ProfilerProvider` (`/providers`) тянет **только** шину/контекст — **НЕ** коллекторы, **НЕ** Dashboard, **НЕ** reporters (по чанку dist).
- Бандл потребителя «provider + один collector» содержит только тот collector, не все 13.
- Trace по-прежнему течёт: `trace()` → зарегистрированный sink провайдера → trace-bus → читатель.

## НЕ делать
- **BaseProviders (web-core) — НЕ трогать**, это парный бриф owner-web-core (тонкий provider всегда + collectors/Dashboard opt-in за `vitals` + финальный ретайр шима). Скоординирую следом.
- Push не делать (commit-only).

## Верификация
`pnpm --filter @capsuletech/web-profiler test` + `build`. Обновить тесты (collectors/reporters/dashboard как children само-регистрируются; provider тонкий). Вернуть последние строки + подтверждение эталон-критерия (чанк provider'а без коллекторов/UI).
