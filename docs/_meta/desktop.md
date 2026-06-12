---
tags: [meta, desktop, ai-context]
status: documented
type: ai-anchor
audience: claude
---

# 🤖 @capsuletech/desktop — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов и owner-desktop. Без воды. Юзеру — [[09-backend/desktop|desktop.md]].

## TL;DR {#tldr}

`@capsuletech/desktop` — library (не CLI binary) для Tauri-shell — публичный API `runDev(opts)` / `runBuild(opts)` + pre-built бинарь в `dist/bin/capsule-desktop[.exe]`. Scaffolding override `.tauri.<app>.json` + child-process orchestration (spawn `tauri dev|build`). Rust crate в `native/` standalone (не workspace-member backend/). Дёргается из `@capsuletech/cli` команда `capsule desktop dev|build <app>`. Fixed version group с CLI (PR 6).

## Где что лежит {#layout}

| Файл | Что |
|---|---|
| `packages/desktop/src/index.ts` | Public API: `runDev`, `runBuild`, re-export типов + metrics |
| `packages/desktop/src/metrics.ts` | **Type-only** — `SystemSnapshot` + 9 sub-types. Zero runtime |
| `packages/desktop/src/override.ts` | Scaffolding `.tauri.<app>.json` (input → expected JSON) |
| `packages/desktop/src/runner.ts` | Child-process orchestration (spawn tauri + cleanup hooks) |
| `packages/desktop/src/types.ts` | `IDesktopConfig`, `RunDevOptions`, `RunBuildOptions` |
| `packages/desktop/src/__tests__/override.test.ts` | Unit: scaffolding logic |
| `packages/desktop/src/__tests__/runner.test.ts` | Integration: spawn + cleanup |
| `packages/desktop/src/__tests__/metrics.test.ts` | Characterization: contract shape + null-semantics |
| `packages/desktop/native/Cargo.toml` | Standalone crate; features: `gpu-nvidia` (default-on) |
| `packages/desktop/native/src/lib.rs` | Tauri entry + 3 commands + managed state + window-event hook |
| `packages/desktop/native/src/metrics.rs` | `SystemSampler`, `CoreProvider`, `GpuProvider` trait, `NvmlGpuProvider` |
| `packages/desktop/native/tauri.conf.json` | Base config (override'ится runDev/runBuild) |
| `packages/desktop/scripts/build-native.mjs` | Platform-dependent copy cargo output → `dist/bin/` |
| `packages/desktop/vite.config.mts` | Lib build через `@capsuletech/lib-builder` |
| `packages/desktop/package.json` | Exports (`.` + `./metrics`), scripts |

## Публичный API (контракт)

```ts
export interface IDesktopConfig {
  productName: string;      // window title + bundle name
  identifier: string;       // bundle identifier (e.g. tech.capsule.sandbox)
  icon?: string;            // path to .ico/.icns (relative to apps/<app>/)
  window?: {
    width?: number;         // default 1280
    height?: number;        // default 800
    minWidth?: number;      // default 800
    minHeight?: number;     // default 600
    title?: string;         // default = productName
  };
}

export interface RunDevOptions {
  app: string;              // app name → `.tauri.<app>.json` override filename
  devUrl: string;           // Vite dev-server URL
  desktop: IDesktopConfig;
  cwd?: string;             // workspace root (default process.cwd())
}

export interface RunBuildOptions {
  app: string;
  dist: string;             // absolute path to built frontend
  desktop: IDesktopConfig;
  version: string;          // bundle version (semver)
  cwd?: string;
}

export function runDev(opts: RunDevOptions): Promise<void>;
export function runBuild(opts: RunBuildOptions): Promise<void>;
```

**Breaking changes в API:** coordinate с owner-cli (consumer через `@capsuletech/cli` action) + owner-builders (type re-export в `defineCapsuleConfig`).

## Metrics API (ADR 023, Phase A)

### Tauri command/event surface

```ts
// pull — one-shot snapshot
const snap = await invoke<SystemSnapshot>('get_system_snapshot');

// push — subscribe to interval stream
await invoke('start_monitoring', { intervalMs: 1000, topProcesses: 10 });
const unlisten = await listen<SystemSnapshot>('system://metrics', (e) => {
  // e.payload : SystemSnapshot
});

// stop
await invoke('stop_monitoring');
```

| Command / Event | Rust signature | Notes |
|---|---|---|
| `get_system_snapshot` | `fn get_system_snapshot(sampler: State<Arc<Mutex<SystemSampler>>>) -> SystemSnapshot` | Reuses persistent sampler; safe to call any time |
| `start_monitoring` | `async fn start_monitoring(interval_ms, top_processes, app, sampler, monitor)` | Idempotent restart; clamps `interval_ms` ≥ 200 |
| `stop_monitoring` | `async fn stop_monitoring(monitor)` | Idempotent abort |
| `"system://metrics"` event | payload: `SystemSnapshot` | Push on every interval tick; stops on `WindowEvent::Destroyed` |

### Type-only subpath

```ts
import type { SystemSnapshot, CpuMetrics, GpuMetrics, GpuVendor } from '@capsuletech/desktop/metrics';
// import type — NOT import (no JS entry exists)
```

`dist/metrics.d.ts` emitted automatically by dts plugin from `src/metrics.ts`. No JS bundle, no runtime deps added.

### Provider architecture

```
SystemSampler (held in Tauri State<Arc<Mutex<...>>>)
├── CoreProvider (sysinfo 0.39.3) — always active
│     cpu / memory / swap / disks / networks / processes / components
└── Vec<Box<dyn GpuProvider>>
      └── NvmlGpuProvider (nvml-wrapper 0.12.1, feature gpu-nvidia) ← Phase A
          [Phase B: WmiGpuProvider, AmdGpuProvider, IntelGpuProvider]
```

**GpuProvider trait** — extension point: add vendor = new `impl GpuProvider` + push in `build_gpu_providers()`. Contract `SystemSnapshot.gpus[]` never changes.

### Cross-platform caveats

| Platform | Behaviour |
|---|---|
| Windows (no admin) | `components: []` — WMI temp sensors require elevation or drivers |
| Non-NVIDIA hardware | `gpus: []` — NVML init fails gracefully; AMD/Intel = Phase B |
| First snapshot (cold) | CPU% may be ≈ 0 — sysinfo needs two refresh cycles (≥200ms) |
| sysinfo processes CPU% | May exceed 100% on multi-core (per-core basis, not global) |

## Lifecycle: runDev / runBuild

### runDev flow
1. Validate `IDesktopConfig` (productName + identifier обязательны)
2. Scaffold override `.tauri.<app>.json` в `packages/desktop/native/` с `build.devUrl = devUrl`
3. Spawn `pnpm exec tauri dev --config .tauri.<app>.json` в `native/` dir
4. Register cleanup hooks (SIGINT, SIGTERM, uncaughtException, normal exit)
5. Await spawn until exit, then cleanup override file
6. Return (error throws via `safeCall` wrap или propagates)

### runBuild flow
1. Validate opts (all fields required)
2. Scaffold override `.tauri.<app>.json` с `build.frontendDist = dist` + `bundle.active = ['msi', 'nsis']` (Windows-only explicit flag)
3. Spawn `pnpm exec tauri build --config <override> [--bundles msi,nsis]` in `native/`
4. Cleanup override on exit
5. Return (binary in `native/target/release/bundle/`)

## Build pipeline (npm scripts)

| Command | What | OS deps |
|---|---|---|
| `pnpm build` | Vite only (JS API) | No special deps |
| `pnpm build:native` | Cargo build + copy `capsule-desktop[.exe]` → `dist/bin/` | Tauri prerequisites (webkit2gtk, libgtk-3, etc.) |
| `pnpm build:all` | Full (Vite + Cargo) | Tauri prerequisites |
| `prepack` hook | Runs `build-native.mjs` auto before `pnpm publish` | Tauri prerequisites |

CI (`pnpm nx run-many -t build`) runs only `pnpm build` (no cargo). `pnpm build:native` runs locally before release (Phase 1) or in matrix CI (Phase 2).

## Rust crate (`packages/desktop/native/`)

- **Standalone:** `edition = "2021"` + `version = "0.1.0"` explicit (no workspace inheritance)
- **Deps:** `tauri = "2"`, `serde`, `serde_json`, `sysinfo = "0.39"`, `nvml-wrapper = "0.12"` (opt, feature `gpu-nvidia`), `log = "0.4"`, `tokio = "1"`, `tauri-build` (build-deps)
- **Features:** `gpu-nvidia` (default-on) — NVIDIA GPU via `nvml-wrapper` + `libloading` (runtime, CI-safe without NVIDIA)
- **Not workspace member:** independent of `backend/scriber/` + `backend/fs/` (different owner zones)
- **Cargo.lock committed** — binary workspace convention
- **`src/main.rs`:** `fn main() { capsule_desktop_lib::run(); }`
- **`src/lib.rs`:** 3 Tauri commands + managed state (`Arc<Mutex<SystemSampler>>` + monitor handle) + window-event cleanup
- **`src/metrics.rs`:** `SystemSampler`, `CoreProvider` (sysinfo), `GpuProvider` trait, `NvmlGpuProvider` (cfg feature)

## Override scaffolding (`runner.ts` + `override.ts`)

`.tauri.<app>.json` is temp override written next to `native/tauri.conf.json`, per-app filename prevents parallel-run collisions.

### Scaffold logic
- Base: load `native/tauri.conf.json`
- Merge: `productName`, `identifier` into `build.productName`, `build.identifier`
- Set: `build.devUrl` (dev) or `build.frontendDist` (build)
- Force: `build.beforeDevCommand = ""` and `build.beforeBuildCommand = ""` (Capsule manages Vite separately)
- Windows-specific: `bundle.active = ['msi', 'nsis']` if `process.platform === 'win32'` + build

### Cleanup
- Idempotent: `cleanedUp` flag + `existsSync` check + try/catch
- Triggered by: SIGINT, SIGTERM, uncaughtException, normal exit
- All hooks converge to single `cleanupOverride()` — must be idempotent to prevent double-unlink

## Известные грабли {#gotchas}

1. **Override-файл cleanup идемпотентный.** `cleanupOverride()` с флагом + existsSync + try/catch. SIGINT/SIGTERM/exit/uncaughtException все сходятся — без идемпотентности бросит.

2. **Windows `--bundles msi,nsis` явный флаг.** `tauri build --config <file>` merge с base `bundle.targets: "all"` ненадёжен (иногда пустой bundle/). Override гарантирует.

3. **`spawn` с `shell: true` обязательно.** На Windows pnpm не находится через PATH без `shell: true`. На Unix OK.

4. **`cwd: nativeDir` обязателен для tauri spawn.** Tauri CLI ищет `tauri.conf.json` в cwd. Если cwd ≠ native/ → fail.

5. **`CAPSULE_APP` / `CAPSULE_WORKSPACE_ROOT` env vars** пробрасываются в child process (legacy compat, usage TBD).

6. **`.tauri.<app>.json` per-app имя.** Позволяет параллельный запуск разных apps без коллизии файлов.

7. **`beforeDevCommand` / `beforeBuildCommand` всегда `""`** (обязательный override). Иначе Tauri попытается запустить свой Vite.

8. **`identifier` — обязательный параметр.** Тип `IDesktopConfig.identifier: string` (не optional). Compilation error если не задан → явная валидация для user.

9. **`dist/__tests__/` в dts output.** Решено через `tsconfig.json:exclude: ["src/**/__tests__/**"]` — libConfig dts плагин не эмиттит test .d.ts файлы.

10. **`cargo build --release` Node.js DEP0190 warning** о `shell: true` с args. Не критично для build-time скрипта — `spawnSync` нужен на Windows.

11. **Build pipeline разделён** для CI compatibility. `pnpm build` (Vite only, CI-friendly) vs `pnpm build:native` (cargo + copy, requires Tauri OS deps). `pnpm build:all` = full local. CI собирает только JS, бинарь собирается перед publish (фаза 1, локально) или matrix (фаза 2).

12. **`prepack` hook = `node scripts/build-native.mjs`** (PR 6). На каждый `pnpm publish` cargo build + copy запускается перед pack — гарантирует `dist/bin/capsule-desktop[.exe]` в tarball'е. Idempotent (cargo cache): fresh ~1-2 min, cached ~1-5s.

## Release & packaging

**Group:** `cli` (fixed version, tag `cli@{version}`)
- `@capsuletech/cli`
- `@capsuletech/compliance`
- `@capsuletech/desktop`
- `@capsuletech/lib-builder`
- `@capsuletech/vite-builder`

**Distribution (Phase 1):** Single-platform binary in `packages/desktop/dist/bin/`. Собирается на машине разработчика (Windows-x64), работает на той же платформе. `capsule-agent-app` и `capsule-test` на том же PC.

**Distribution (Phase 2, отдельный ADR):** Matrix CI build per platform, optional deps per platform (`@capsuletech/desktop-{darwin-arm64,darwin-x64,linux-x64,win32-x64}`), runtime resolution через `require.resolve('@capsuletech/desktop-${platform}')`.

## Test coverage {#tests}

| Тип | Где | Что |
|---|---|---|
| Unit | `src/__tests__/override.test.ts` | scaffolding: input → expected `.tauri.<app>.json` |
| Integration | `src/__tests__/runner.test.ts` | spawn orchestration: mock tauri, check args + cleanup |
| Smoke (Rust) | CI | `cargo check --manifest-path packages/desktop/native/Cargo.toml` |
| E2E | `packages/cli/e2e/` (после PR 6) | `cd apps/sandbox && capsule desktop dev` → Tauri окно + devUrl connects |

## Что менять когда {#changes-guide}

| Хочу… | Куда лезть |
|---|---|
| Добавить Tauri plugin (keyring, dialog, fs) | `native/Cargo.toml` deps + `src/lib.rs` `.plugin(...)` call + `capabilities/default.json` |
| Расширить `IDesktopConfig` (новое окно свойство) | `src/types.ts` (breaking change — coordinate) |
| Изменить override scaffolding logic | `src/override.ts` + обновить тесты |
| Изменить child-process spawn | `src/runner.ts` (watch для idempotency cleanup + spawn args) |
| Поменять Vite lib config | `vite.config.mts` (через `@capsuletech/lib-builder`) |
| Добавить новый platform support | Phase 2 ADR (matrix build, optional deps) |
| Добавить code signing | Phase 3 ADR (installer infrastructure) |
| Добавить GPU-вендора (AMD/Intel) | `native/src/metrics.rs` — новый `impl GpuProvider` + регистрация в `build_gpu_providers()` (Phase B comment). Контракт `SystemSnapshot.gpus[]` НЕ меняется |
| Изменить `SystemSnapshot` контракт | `native/src/metrics.rs` serde struct + `src/metrics.ts` TS type (оба вручную!) + обновить тест `metrics.test.ts` — это breaking change для app-фронта |
| Изменить интервал/топ-процессов мониторинга | `start_monitoring(intervalMs, topProcesses)` — параметры runtime, не compile-time |

## Cross-package dependencies {#cross-package-deps}

| Пакет | Как | Owner |
|---|---|---|
| `@capsuletech/cli` | импортирует `runDev`/`runBuild` в action `capsule desktop dev/build` | owner-cli |
| `@capsuletech/vite-builder` | реэкспортирует тип `IDesktopConfig` в `defineCapsuleConfig` | owner-builders |
| `@capsuletech/lib-builder` | Vite lib config для `src/` build | owner-builders |
| `backend/scriber/` | sibling Rust crate (separate workspace, separate owner) | owner-scriber |
| `apps/agent/` | будущий consumer (Tauri desktop для scriber) | будущий owner-app |

## Roadmap (Phase 1-4)

**Phase 1 (это PR):** Workspace + Verdaccio + single-platform binary + docs. ETA — несколько сессий.

**Phase 2:** Multi-platform distribution (matrix build, optional deps per platform, peer-deps audit). Отдельный ADR.

**Phase 3:** Installer'ы (`.dmg`/`.msi`/`.AppImage` through `cargo tauri build --bundles`), code signing. Trigger: готовый app для дистрибуции.

**Phase 4 (optional):** `capsule desktop eject` escape hatch для custom Rust. Trigger: first concrete request.

ADR переходит в `status: implemented` после Phase 1 (PR 8 merged).

## Связанное {#related}

- [[017-desktop-package|ADR 017]] — design rationale + alternatives
- [[../../packages/desktop/OWNERSHIP|@capsuletech/desktop OWNERSHIP.md]] — зона owner-desktop
- [[../../.claude/agents/owner-desktop|owner-desktop agent]] — инструкции для owner'а
- [Tauri 2 docs](https://v2.tauri.app/) — runtime contract
- [[cli|@capsuletech/cli AI-anchor]] — consumer, импортирует runDev/runBuild
- [[builders|@capsuletech/builders AI-anchor]] — type реэкспорт для defineCapsuleConfig
