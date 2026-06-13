---
tags: [hca, adr, desktop, proposed]
status: proposed
date: 2026-06-01
last_updated: 2026-06-12
---

# ADR 023 — Desktop system metrics (`@capsuletech/desktop`)

> [!note] Status: proposed (2026-06-01)
> Phase A — host-метрики через `sysinfo` (CPU/RAM/диски/сеть/процессы/температуры) + GPU-провайдер NVIDIA (`nvml-wrapper`). Provider-абстракция заложена под AMD/Intel/WMI (Phase B). Реализация — `owner-desktop` в `packages/desktop/`; фронт-потребление — отдельным заходом app-агентом по handoff-инструкции.

## Контекст {#context}

`@capsuletech/desktop` (ADR 017) — Tauri-shell host. Сейчас `native/` — **pure shell**: `tauri::Builder::default().plugin(tauri_plugin_dialog::init())` без собственных команд (`packages/desktop/native/src/lib.rs`). Capability — `core:default` + `dialog:default`.

Запрос: desktop-приложения capsule должны показывать **системный мониторинг производительности** хоста — нагрузка CPU, оперативная память, диски, сеть, процессы, температуры и **GPU** (загрузка видеокарты, видеопамять, температура, потребление).

ADR 017 это предусмотрел как точку расширения:
> «Tauri plugins (keyring, fs, dialog, etc.) — добавляются по запросу как `tauri` features в `packages/desktop/native/Cargo.toml`.»

Это **первый конкретный запрос** на расширение native API surface встроенной capability (не user-custom Rust — то Phase 4 ADR 017 escape hatch).

## Проблема {#problem}

**1. Webview не имеет доступа к host-метрикам.** Внутри webview только browser-API: `performance.memory` (JS-heap самого webapp, не RAM хоста), нет CPU/GPU/диск/сеть хоста. `@capsuletech/web-profiler` мониторит **сам webapp** (Web Vitals, FPS, long tasks) — это другой слой, хост он не видит. Доступ к ОС есть только у Rust-стороны Tauri.

**2. Нет API.** `native/` не экспонирует ни одной `#[tauri::command]`. Фронту нечего звать.

**3. GPU кросс-вендорный — болезненный.** Единого хорошего cross-vendor Rust-крейта нет. NVIDIA закрывается `nvml-wrapper` чисто; AMD/Intel — платформенные API (WMI/PDH на Windows, sysfs на Linux, IOKit/Metal на macOS). Если зашить GPU-чтение «в лоб», добавление вендора потребует переписывания контракта фронта. Нужна абстракция, изолирующая вендорную боль.

**4. Мониторинг — это поток, а не one-shot.** Дёргать `invoke` в `requestAnimationFrame` — антипаттерн (нагрузка, дрожание интервала, race с IPC). Правильно — **push**: Rust на интервале эмитит событие, фронт подписан.

**5. Куда отдать типы фронту — не очевидно.** `@capsuletech/desktop` спозиционирован как **build-time library** (node-процесс, спавнит Tauri); у него нет webview-runtime (OWNERSHIP.md: JS-биндинги плагинов живут в webview-контексте consuming app, не в этом пакете). Тащить webview-обёртку с `@tauri-apps/api` в build-time пакет = смешение concern'ов + новые runtime-deps.

## Решение {#decisions}

### 1. Унифицированный контракт `SystemSnapshot`

Единая форма данных, сериализуется serde → JSON, одинакова для pull-команды и push-события. Camel-case ключи (для прямого потребления в JS без ремаппинга).

```jsonc
// payload "system://metrics" event И возврат get_system_snapshot()
{
  "timestamp": 1730000000000,          // ms epoch (момент снятия)
  "cpu": {
    "globalUsage": 23.4,               // % 0..100
    "cores": [12.0, 40.1, 8.3, 55.0],  // % per logical core
    "physicalCount": 8,
    "logicalCount": 16,
    "frequencyMhz": 3600,              // если доступно, иначе null
    "brand": "AMD Ryzen 7 ..."         // model string
  },
  "memory": {
    "totalBytes": 34359738368,
    "usedBytes": 18253611008,
    "availableBytes": 16106127360,
    "usagePercent": 53.1
  },
  "swap": {
    "totalBytes": 8589934592,
    "usedBytes": 1073741824,
    "usagePercent": 12.5
  },
  "disks": [
    {
      "name": "C:",
      "mountPoint": "C:\\",
      "fileSystem": "NTFS",
      "totalBytes": 512110190592,
      "availableBytes": 210123456789,
      "usagePercent": 58.9,
      "kind": "SSD"                     // SSD | HDD | Unknown
    }
  ],
  "networks": [
    {
      "interfaceName": "Ethernet",
      "receivedBytes": 1024,            // delta за интервал
      "transmittedBytes": 512,
      "totalReceivedBytes": 9876543210,// cumulative с запуска ОС
      "totalTransmittedBytes": 1234567890
    }
  ],
  "processes": [                        // top-N по CPU, N конфигурируем (default 10)
    {
      "pid": 4242,
      "name": "node",
      "cpuUsage": 14.2,                 // % (может быть >100 на multi-core)
      "memoryBytes": 524288000
    }
  ],
  "components": [                       // температуры, best-effort
    {
      "label": "CPU Tctl",
      "temperatureC": 58.0,             // null если сенсор не отдал
      "maxC": 95.0,                     // null если неизвестно
      "criticalC": 100.0               // null если неизвестно
    }
  ],
  "gpus": [                             // ПУСТОЙ массив, если провайдеров нет
    {
      "vendor": "nvidia",              // nvidia | amd | intel | unknown
      "name": "NVIDIA GeForce RTX ...",
      "utilizationPercent": 47.0,      // null если вендор не отдал
      "memoryTotalBytes": 12884901888,
      "memoryUsedBytes": 4294967296,
      "memoryUsagePercent": 33.3,
      "temperatureC": 62.0,            // null если недоступно
      "powerWatts": 145.0,             // null если недоступно
      "coreClockMhz": 1800,            // null если недоступно
      "fanPercent": 40.0               // null если недоступно
    }
  ]
}
```

**Инвариант:** каждое поле, которое конкретный источник не отдал, сериализуется как `null` (а не пропускается и не подменяется нулём) — фронт отличает «0%» от «датчик молчит». `gpus`/`components`/`disks`/`networks`/`processes` — массивы, могут быть пустыми, не `null`.

### 2. Provider-абстракция

```
SystemSampler
├── CoreProvider          (sysinfo)  — always available, cross-platform
│     └── cpu, memory, swap, disks, networks, processes, components
└── Vec<Box<dyn GpuProvider>>        — собирается при старте из доступных
      ├── NvmlGpuProvider  (nvml-wrapper, feature `gpu-nvidia`)  ← Phase A
      ├── [WmiGpuProvider]  (Windows PDH, cross-vendor fallback)  ← Phase B
      ├── [AmdGpuProvider]  (sysfs / ADLX)                        ← Phase B
      └── [IntelGpuProvider]                                       ← Phase B
```

```rust
// контракт расширения — добавить вендора = новый impl, контракт фронта НЕ меняется
trait GpuProvider: Send {
    fn vendor(&self) -> GpuVendor;
    fn sample(&mut self) -> Vec<GpuMetrics>;   // [] если в этот тик нечего
}
```

При старте `SystemSampler::new()` пробует инициализировать каждого известного провайдера; **неудачная инициализация (нет драйвера/железа/feature off) → провайдер не добавляется в registry, без паники**. `gpus` в снапшоте = конкатенация `sample()` всех живых провайдеров. Нет ни одного → `gpus: []`. Это и есть «закладка под любое железо»: Phase B добавляет `impl GpuProvider`, регистрирует в фабрике — контракт `SystemSnapshot.gpus[]` и фронт остаются нетронутыми.

### 3. Tauri command/event surface

```
#[tauri::command] get_system_snapshot() -> SystemSnapshot   // разовый pull
#[tauri::command] start_monitoring(intervalMs: u64, topProcesses: u32) -> ()
#[tauri::command] stop_monitoring() -> ()
event  "system://metrics"  payload: SystemSnapshot           // push на интервале
```

- **Pull** (`get_system_snapshot`) — для разового снимка / ленивых экранов.
- **Push** (`start_monitoring` → `stop_monitoring`) — фоновый async-таск эмитит `system://metrics` каждые `intervalMs`. Один активный таск на окно; повторный `start_monitoring` рестартует с новым интервалом (idempotent guard). `stop_monitoring` глушит. Таск автоматически глохнет при закрытии окна (cancellation через app handle).
- Persistent `System`-инстанс держится за `tauri::State<Mutex<SystemSampler>>` — **обязательно**, т.к. `sysinfo` считает CPU% и сетевые delta как разницу между двумя последовательными refresh'ами; пересоздание инстанса на каждый тик сломало бы проценты.

### 4. Permission-модель

Новый capability-набор (не размывать `default`):

```jsonc
// native/capabilities/default.json — добавить permissions
"permissions": [
  "core:default",
  "dialog:default",
  "core:event:default"          // listen на "system://metrics"
  // команды get_system_snapshot/start_monitoring/stop_monitoring —
  // через generated command-permissions набора (allow по умолчанию для main window)
]
```

Команды объявляются через `tauri::generate_handler!` и разрешаются capability'ей `main`-окна. Дополнительный namespace permission под метрики — на Phase B, если появятся untrusted-окна.

### 5. Delivery фронту — type-only, без runtime в пакете

`@capsuletech/desktop` **остаётся build-time library**. Добавляется **type-only subpath**:

```jsonc
// package.json exports
"./metrics": { "types": "./dist/metrics.d.ts" }   // ТОЛЬКО types, без import/default
```

`src/metrics.ts` содержит **только** `export interface SystemSnapshot {...}` и сопутствующие типы (`CpuMetrics`, `GpuMetrics`, `GpuVendor`, …) — zero runtime, zero новых deps, **не трогает `pnpm-lock.yaml`**. Это single source of truth формы данных: Rust-`serde`-структуры и TS-типы держатся в синхроне вручную (один контракт, два представления), guard — характеризационный тест в Phase A.

App потребляет на фронте через **штатный `@tauri-apps/api`** (он уже есть у любого Tauri-app для dialog и пр.):

```ts
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { SystemSnapshot } from '@capsuletech/desktop/metrics';
```

В HCA-терминах это **Feature** (единственный слой с правом на IO): `listen('system://metrics')` → валидация через `Entities.SystemMetrics.schema` (zod-зеркало контракта) → `store.update(...)`. View/Shape рисуют из store. **Это пишет app-агент** по handoff-инструкции — не зона `@capsuletech/desktop`.

### 6. Build / release impact

- **Rust deps** (`native/Cargo.toml`): `+ sysinfo`, `+ nvml-wrapper` (за feature `gpu-nvidia`, default-on). `Cargo.lock` пакета обновляется (его файл, ОК).
- **Бинарь** растёт незначительно (sysinfo ~lightweight; nvml-wrapper линкуется к системной NVML, не статлинкует драйвер).
- **CI**: `pnpm build` пакета = только Vite (JS, без cargo) — не меняется. `cargo check` в CI покрывает компиляцию native (с/без feature).
- **Release group**: `cli` (fixed) — без изменений. Версия пакета bump'ается в общем потоке группы.
- **Type-only subpath — без координации с owner-builders.** Проверено: `libConfig` dts-плагин эмитит `.d.ts` для **всех** `src/**/*.ts` (`include: ['src/**/*.ts']`, `entryRoot: 'src'`), независимо от JS-entry в `build.lib`. Поэтому `src/metrics.ts` (только `export interface`/`export type`) → `dist/metrics.d.ts` эмитится **автоматически**, JS-entry добавлять не нужно, `dist/metrics.mjs` не появляется. `src/index.ts` может type-only-реэкспортировать (`export type { SystemSnapshot } from './metrics'`) — erased на build, runtime-связи нет. Достаточно добавить `exports["./metrics"]: { "types": "./dist/metrics.d.ts" }` в `package.json`.

## Реализационные детали

### sysinfo API (ориентир, версию пинит owner-desktop)

sysinfo 0.3x разнёс домены по структурам: `System` (cpu/mem/processes/components на новых версиях вынесены в `Components`), `Disks`, `Networks`, `Components`. Owner-desktop адаптируется под resolved-версию. Ключевое:
- `System::new_all()` + `refresh_*` — держать persistent.
- CPU%: первый refresh даёт 0, нужен второй спустя `MINIMUM_CPU_UPDATE_INTERVAL` (~200ms). Для push-режима интервал ≥ этого порога; для pull-режима — двойной refresh с короткой задержкой внутри команды (или возврат last-known из persistent-инстанса).
- Сеть: `received()/transmitted()` — delta с прошлого refresh; `total_*` — cumulative.

### nvml-wrapper (NVIDIA)

`Nvml::init()` (требует установленный драйвер; в air-gapped/без-NVIDIA окружении вернёт Err → провайдер не регистрируется). Per-device: `utilization_rates()` (gpu/memory %), `memory_info()` (total/used/free), `temperature(Gpu)`, `power_usage()` (mW → W), `clock_info(SM)`, `fan_speed()`. Каждое — в `Option`, маппится в `null` при Err конкретного сенсора (не валим весь snapshot).

### Lifecycle фоновой задачи

- `start_monitoring`: спавнит `tauri::async_runtime::spawn` с `tokio::time::interval`; хендл кладётся в `State<Mutex<Option<MonitorHandle>>>`.
- `stop_monitoring` / повторный `start`: `handle.abort()` старого перед спавном нового.
- Закрытие окна: `WindowEvent::CloseRequested` / `Destroyed` → abort. Без этого таск эмитил бы в мёртвое окно.

### Cross-platform caveats (документируется в anchor)

- **Температуры**: на Windows `sysinfo::Components` часто пуст без админ-прав/спец-драйверов — `components: []` норма, не баг.
- **Per-process CPU%** суммарно может превышать 100% (на ядро).
- **GPU**: Phase A покрывает только NVIDIA; на AMD/Intel `gpus: []` пока Phase B не добавит провайдера. Это явно отражается в инструкции app-агенту (UI должен gracefully показывать «GPU: n/a»).

## Альтернативы, которые НЕ взяли

### A. Читать GPU «в лоб» без trait-абстракции
Каждый вендор хардкодом в теле команды. Отклонено: добавление AMD/Intel переписывает контракт и фронт — ровно та боль, которую п.3 изолирует.

### B. Pull-only: фронт дёргает `get_system_snapshot` в `setInterval`/RAF
Отклонено: IPC-overhead на каждый тик, дрожание интервала, race с другими invoke. Push через event — индустриальная норма для мониторинга. Pull оставлен как дополнение для разовых снимков.

### C. Отдельный пакет `@capsuletech/desktop-metrics`
Отклонено: native shell уже в `@capsuletech/desktop/native`, метрики — его команды. Отдельный пакет дублировал бы Tauri-инфру и release-coupling. Overkill.

### D. Ship JS-runtime обёртку (`@capsuletech/desktop/runtime` с `@tauri-apps/api`)
Отклонено в Phase A: ломает build-time чистоту пакета (OWNERSHIP), добавляет webview-runtime deps, трогает `pnpm-lock`. Вместо — **type-only** subpath (п.5): контракт типизирован, рантайм-вызовы остаются на штатном `@tauri-apps/api` у app'а. Полноценную typed-обёртку можно ввести позже отдельным ADR, если появится спрос.

### E. WMI/PDH cross-vendor GPU сразу (вместо NVML)
Отклонено для Phase A: WMI `GPU Engine` counters шумные, агрегируются нетривиально, Windows-only. NVML — точный, прямой, под наличное железо (NVIDIA). WMI — кандидат в Phase B как fallback для non-NVIDIA на Windows.

## Последствия {#consequences}

### Положительные
- Host-метрики доступны desktop-приложениям capsule через чистый push/pull контракт.
- GPU расширяемо per-vendor без изменения контракта и фронта (Phase B = drop-in `impl GpuProvider`).
- Build-time чистота пакета сохранена (type-only delivery), `pnpm-lock` не затронут.
- Фронт ложится в HCA штатно (Feature listen → store), переиспользует `@tauri-apps/api`.

### Отрицательные
- Native API surface пакета растёт (3 команды + 1 событие + capability) — больше поверхности для owner-desktop.
- Rust dep surface +`sysinfo` +`nvml-wrapper`; бинарь чуть тяжелее.
- Контракт Rust↔TS синхронизируется **вручную** (два представления одной формы) — нужен guard-тест.
- Single-platform остаётся (наследие Phase 1 ADR 017): бинарь под платформу разработчика.
- Phase A GPU = только NVIDIA. AMD/Intel → `gpus: []` до Phase B.

### Roadmap

- **Phase A (этот ADR):** sysinfo core (CPU/RAM/диски/сеть/процессы/температуры) + NVIDIA GPU provider + type-only contract. Реализация owner-desktop. Фронт — app-агент по инструкции.
- **Phase B:** доп. GPU-провайдеры (WMI cross-vendor fallback, AMD, Intel). Отдельным заходом, контракт не меняется.
- **Phase C (если будет спрос):** историзация/буфер метрик в Rust, пороги/алерты, typed JS-обёртка. Отдельный ADR.

`status: proposed` → `accepted` после ревью пользователем, → `implemented` после merge Phase A PR.

## Связанное {#related}

- [[017-desktop-package|ADR 017]] — extraction `@capsuletech/desktop`, точка расширения native features
- [[../../packages/desktop/OWNERSHIP|@capsuletech/desktop OWNERSHIP.md]] — зона owner-desktop (обновляется в Phase A)
- [[../../docs/_meta/desktop|docs/_meta/desktop.md]] — AI-anchor (обновляется в Phase A)
- `@capsuletech/web-profiler` — мониторинг **самого webapp** (Web Vitals/FPS/heap), НЕ хоста — не путать
- [sysinfo crate](https://docs.rs/sysinfo) — cross-platform host metrics
- [nvml-wrapper crate](https://docs.rs/nvml-wrapper) — NVIDIA Management Library bindings
- [Tauri 2 — Commands & Events](https://v2.tauri.app/develop/calling-rust/) — runtime contract
