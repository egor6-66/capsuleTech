# Brief — BaseProviders на тонкий профайлер-хаб (owner-web-core)

**ADR:** [[063-thin-providers-subpath-capabilities]] D5. **Зона:** `packages/web/runtime/core/` (scope `core`). Парный к de-barrel'у профайлера (commit `1abbe9c5`).

**Срочно:** сейчас web-core **сломан** — `base.tsx` импортит удалённый `VitalsMonitoringProvider`. Этот бриф разблокирует.

## Цель
`BaseProviders` монтит **тонкий хаб профайлера + console-trace-reporter ВСЕГДА** (trace-канал во всех аппах, тогл off, ноль оверхеда). Тяжёлые collectors/Dashboard в BaseProviders **НЕ** живут (app-level opt-in, будущее). Потребитель тут — фреймворк-пакет → берёт субпаты профайлера **прямым импортом** (это норма для фреймворк-кода).

## Что сделать (`src/providers/base.tsx`)

1. **Убрать** `import { VitalsMonitoringProvider } from '@capsuletech/web-profiler'` + весь блок `<Show when={props.vitals}><VitalsMonitoringProvider showDashboard=...>{tree}</...></Show>`.

2. **Импортить гранулярно** (субпаты, не барл):
   - `ProfilerProvider` из `@capsuletech/web-profiler/providers` (тонкий хаб после de-barrel: только шины + trace-sink + контексты).
   - console-trace-reporter компонент из `@capsuletech/web-profiler/reporters` (точное имя — глянь экспорты `/reporters`; это компонент-читатель, подписывается на trace-bus из контекста).

3. **Обернуть дерево ВСЕГДА** (без `Show`/флага):
   ```tsx
   <ProfilerProvider>
     <ConsoleTraceReporter />
     {tree}
   </ProfilerProvider>
   ```
   ProfilerProvider создаёт шины + регистрирует trace-sink → `trace()` из любого пакета течёт сюда; console-reporter печатает при `?trace=`/`trace.enable()`. Тогл off по умолчанию → молчит, ноль аллокаций.

4. **Удалить мёртвые props** `vitals` + `showDashboard` из `IBaseProviderProps`. Они **никем не передаются** — `createCapsuleApp.buildAppComponent` рендерит `<BaseProviders>` без них (проверено). Поэтому удаление безопасно, миграции нет.

5. Обновить doc-комментарий интерфейса (был про `vitals`/`VitalsMonitoringProvider`).

## Тесты
`providers/__tests__/base-providers-*.test.ts` мокают `@capsuletech/web-profiler` (`VitalsMonitoringProvider`) — обновить мок на новые импорты (`/providers` ProfilerProvider + `/reporters` console-trace). Добавить проверку: дерево всегда обёрнуто в ProfilerProvider (хаб смонтирован).

## Эталон-критерий
- `BaseProviders` импортит только тонкий хаб + console-trace-reporter — **НЕ** коллекторы, **НЕ** Dashboard (по импортам/чанку).
- Любой апп через `BaseProviders` → `?trace=remote` показывает trace в консоли (это разблокирует диагностику remote-бага A).

## НЕ делать
- НЕ тянуть collectors/Dashboard (app-level opt-in, будущее — через гранулярный `packages:`, отдельный заход).
- НЕ трогать `packages:`/`CapsuleRegistryPlugin` (отдельная инициатива — барел app→пакет, в аудит).
- НЕ трогать apps/*. Push не делать (commit-only).

## Верификация
`pnpm --filter @capsuletech/web-core test` + `build`. Вернуть последние строки.
