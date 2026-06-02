---
name: "@capsuletech/desktop"
owner-agent: owner-desktop
group: cli
status: pre-1.0
last-updated: 2026-05-23
---

# @capsuletech/desktop

Tauri-shell host для capsule apps. Library с public API `runDev`/`runBuild` (orchestrate Vite + Tauri) + pre-built бинарь (`dist/bin/capsule-desktop[.exe]`). Дёргается из `@capsuletech/cli` командой `capsule desktop dev|build <app>`.

> [!info] Status: JS wrapper + build pipeline implemented (PR 3/8)
> JS wrapper (`src/`) + build pipeline (`scripts/`) завершены. `runDev`/`runBuild` API готов. Следующее: PR 4 (config type, owner-builders) → PR 5 (CLI action, owner-cli).

## Зона ответственности

### Owns

- `packages/desktop/src/` — JS wrapper (PR 3): `runDev`, `runBuild`, override scaffolding, child-process orchestration, types
- `packages/desktop/native/` — Rust crate (PR 2): Tauri shell, `Cargo.toml`, `tauri.conf.json`, `src/{main.rs,lib.rs}`, `capabilities/`, `icons/`, `build.rs`
- `packages/desktop/scripts/` — build helpers (PR 3): `build-native.mjs` (platform-dependent копирование бинаря)
- `packages/desktop/vite.config.mts` (PR 3) — lib build через `@capsuletech/lib-builder`
- `packages/desktop/package.json` — exports / deps / scripts
- `packages/desktop/tsconfig.json` (PR 3)

### Не трогает

- `packages/cli/src/actions/desktop.ts` — CLI action (owner-cli)
- `packages/cli/src/commands/desktop.ts` — Command декларация (owner-cli)
- `backend/scriber/`, `backend/fs/` — sibling Rust зоны (owner-scriber для scriber, главный для shared fs)
- `backend/Cargo.toml` — workspace members + deps (главный, в PR 2 убирает `"desktop"` из members)
- `apps/<app>/capsule.config.ts` — framework-developer scope (но **тип** `desktop` section реэкспортируется отсюда — coordinated через owner-builders в PR 4)
- `nx.json:release.groups.cli` — главный (в PR 6 добавляет `@capsuletech/desktop` в group)
- Root-level `package.json`, `tsconfig.base.json`, `CLAUDE.md` — главный

## Публичный API (планируемый, финализируется в PR 3)

```ts
// @capsuletech/desktop (.)
export interface IDesktopConfig {
  productName: string;
  identifier: string;
  icon?: string;
  window?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    title?: string;
  };
}

export interface RunDevOptions {
  app: string;
  devUrl: string;
  desktop: IDesktopConfig;
  cwd?: string;
}

export interface RunBuildOptions {
  app: string;
  dist: string;
  desktop: IDesktopConfig;
  version: string;
  cwd?: string;
}

export function runDev(opts: RunDevOptions): Promise<void>;
export function runBuild(opts: RunBuildOptions): Promise<void>;
```

Никакого `bin` поля — это library. `dist/bin/capsule-desktop[.exe]` — internal asset, не CLI entry.

## Quirks / gotchas

Мигрированы из `scripts/desktop.mjs` + новые из PR 3:

1. **Override-файл cleanup идемпотентный.** `cleanedUp` flag + `existsSync` + try/catch в `runner.ts:cleanupOverride`. SIGINT/SIGTERM/exit/uncaughtException — все сходятся в одну функцию. Без идемпотентности double-unlink бросает.

2. **Windows `--bundles` явный CLI flag.** `process.platform === 'win32' && kind === 'build'` → `['--bundles', 'msi,nsis']` в argv. `tauri build --config <file>` merge с `bundle.targets:"all"` ненадёжен — build выходит 0, `target/release/bundle/` пустой.

3. **`spawn` с `shell: true` обязательно.** На Windows pnpm не находится через PATH без `shell: true`. На Unix тоже OK.

4. **`cwd: nativeDir` обязателен для tauri spawn.** Tauri CLI ищет `tauri.conf.json` относительно cwd. Если cwd = workspace root — fail.

5. **`CAPSULE_APP` / `CAPSULE_WORKSPACE_ROOT` env vars** прокидываются в child process. Сохранено из `scripts/desktop.mjs:164` для обратной совместимости.

6. **`.tauri.<app>.json` — per-app имя файла.** Позволяет параллельный запуск двух app'ов (sandbox + agent) одновременно без коллизии файлов.

7. **`beforeDevCommand` / `beforeBuildCommand` всегда пустые.** Tauri иначе попытается запустить свой Vite. Capsule управляет Vite через `@capsuletech/vite-builder`. Обязательный override.

8. **`identifier` — обязательный параметр.** В отличие от старого `scripts/desktop.mjs`, fallback из имени app'а убран. Тип `IDesktopConfig.identifier: string` (не optional). User получает ошибку компиляции если не задал.

9. **Dist `__tests__/` в dts output.** Решено через `tsconfig.json:exclude: ["src/**/__tests__/**"]` — libConfig dts плагин читает этот tsconfig и не эмитит тестовые .d.ts файлы.

10. **`cargo build --release` node-deprecation warning** о `shell: true` с args. Это Node.js DEP0190 (args + shell). Не критично для build-time скрипта — `spawnSync` с `shell: true` нужен на Windows для `cargo` через PATH.

11. **Build pipeline разделён** (PR 3, CI compat). `pnpm build` = только vite (JS-артефакты, CI-friendly). `pnpm build:native` = cargo + copy бинаря в `dist/bin/` (требует Tauri OS deps + Rust toolchain). `pnpm build:all` = full local pipeline. CI собирает только JS (через `pnpm nx run-many -t build`); бинарь собирается перед release publish — локально (фаза 1) или matrix-build (фаза 2).

12. **`prepack` hook = `node scripts/build-native.mjs`** (PR 6). На каждый `pnpm publish` (release-local.mjs или ручной) cargo build + copy запускается автоматически перед pack — гарантирует `dist/bin/capsule-desktop.exe` в tarball'е. Idempotent (cargo cache); fresh build ~1-2 min, cached ~1-5s. Без prepack tarball был бы broken — `runDev`/`runBuild` consumer'ов (`@capsuletech/cli`) не нашли бы бинарь.

13. **COM-апартмент на Windows (actor-thread, критично).** `tao` (Tauri windowing) вызывает `OleInitialize` на **главном потоке** в режиме STA. sysinfo `Components` (WMI) и nvml-wrapper `Nvml::init()` инициализируют COM в режиме **MTA**. Если любой из них запустится на главном потоке до `tauri::Builder::run()` — `OleInitialize` вернёт `RPC_E_CHANGED_MODE` → паника (exit code 101) при создании окна. **Инвариант:** `SystemSampler::new()` и все COM-инициализирующие вызовы ДОЛЖНЫ происходить на выделенном `std::thread` (sampler actor), а не на главном потоке. В `lib.rs` это обеспечено: канал `mpsc::unbounded_channel` создаётся до `tauri::Builder`, `std::thread::spawn` запускает `SystemSampler::new()` внутри потока. При добавлении Phase-B провайдеров (WMI, AMD, Intel) в `build_gpu_providers()` — они автоматически вызываются из `SystemSampler::new()` на sampler-потоке, инвариант сохраняется.

14. **Температуры на Windows (ADR 023).** `sysinfo::Components` возвращает пустой список без admin-прав или специальных WMI-драйверов. `components: []` — норма, не баг. UI должен gracefully обрабатывать пустой массив.

15. **GPU — только NVIDIA в Phase A (ADR 023).** `nvml-wrapper` использует `libloading` (runtime dlopen). На машинах без NVIDIA или без драйвера `Nvml::init()` → Err → провайдер не регистрируется → `gpus: []`. AMD/Intel добавляются в Phase B без изменения контракта фронта.

16. **CPU% ≈ 0 на первом `get_system_snapshot` (холодный старт).** sysinfo считает CPU% как разницу двух refresh'ей. `SystemSampler::new()` делает начальный seed. Если `start_monitoring` не запускался перед первым `get_system_snapshot`, первый результат может показывать CPU ≈ 0. Решение: или запустить `start_monitoring` заблаговременно, или выдержать ≥200ms паузу между двумя pull-вызовами.

17. **`start_monitoring`/`stop_monitoring` — idempotent.** Повторный `start` прерывает предыдущий task и запускает новый. `stop` при остановленном — no-op.

18. **`./metrics` subpath — ТОЛЬКО types, нет JS entry.** `exports["./metrics"]` содержит только `"types"`, нет `"import"`. Используй исключительно `import type { ... } from '@capsuletech/desktop/metrics'`.

## План рефакторинга / оптимизаций

PR 1-8 (см. ADR 017 Roadmap):

- [x] **PR 1** ADR 017 + skeleton + owner-desktop agent
- [x] **PR 2** Crate move `backend/desktop/` → `packages/desktop/native/`. `backend/Cargo.toml` обновить, убрать `"desktop"` из workspace.members. Cargo standalone (`edition = "2021"`, `version = "0.1.0"`)
- [x] **PR 3** JS wrapper + build pipeline. `scripts/desktop.mjs` логика → `src/`. `pnpm build` = только vite (JS); `pnpm build:native` = cargo + binary copy; `pnpm build:all` = full local pipeline
- [ ] **PR 4** Config type расширение — секция `desktop` в `defineCapsuleConfig`. Coordinated с owner-builders
- [ ] **PR 5** CLI command — `capsule desktop dev/build <app>` импортирует `runDev`/`runBuild` напрямую (вместо `execa scripts/desktop.mjs`). Coordinated с owner-cli
- [x] **PR 6** Verdaccio publish — `@capsuletech/desktop` добавлен в `nx.json:release.groups.cli` + `scripts/release-local.mjs` (главный). `prepack` hook гарантирует `dist/bin/` в tarball'е. Smoke в `capsule-test` — coordinated с owner-tests
- [ ] **PR 7** Docs — `docs/_meta/desktop.md` + `docs/09-backend/desktop.md`. Coordinated с docs-writer
- [ ] **PR 8** Cleanup — удалить `scripts/desktop.mjs`, alias из root `package.json`, обновить `CLAUDE.md` секцию Desktop

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/override.test.ts` (PR 3) | scaffolding override config — input → expected `.tauri.<app>.json` |
| Integration | `src/__tests__/runner.test.ts` (PR 3) | child-process orchestration — mock tauri CLI, проверить spawn args + cleanup |
| E2E | `packages/cli/e2e/` (PR 6 расширение) | `cd apps/sandbox && capsule desktop dev` — Tauri окно открывается + devUrl connects (имя app'а через `ctx.name`, не positional) |

Перед изменением:
```bash
pnpm --filter @capsuletech/desktop test
```

Перед release:
```bash
pnpm test:e2e:cli   # включает desktop tarball assertion (после PR 6)
```

## Публичный API — metrics (ADR 023, Phase A)

### Tauri command/event surface

| Surface | Signature | Description |
|---|---|---|
| command `get_system_snapshot` | `() -> SystemSnapshot` | One-shot pull of full host metrics |
| command `start_monitoring` | `(intervalMs: u64, topProcesses: u32) -> ()` | Start background push. Idempotent — restarts with new params if already running. `intervalMs` clamped to ≥ 200. `topProcesses = 0` → default 10 |
| command `stop_monitoring` | `() -> ()` | Stop background push. Idempotent |
| event `"system://metrics"` | payload: `SystemSnapshot` | Emitted every `intervalMs` while monitoring is active |

**Cleanup:** background task is aborted on `WindowEvent::Destroyed` — prevents emitting into a dead window.

### Type-only subpath

```ts
import type { SystemSnapshot } from '@capsuletech/desktop/metrics';
```

`src/metrics.ts` → `dist/metrics.d.ts` (auto-emitted by dts plugin). Zero runtime — `export interface` / `export type` only. No JS entry for `./metrics`.

## Зависимости (Rust crate) — active plugins

| Crate | Version | Purpose |
|---|---|---|
| `tauri` | `2` (resolved `2.11.2`) | Tauri core shell |
| `tauri-plugin-dialog` | `2` (resolved `2.7.1`) | Native file/folder/message dialogs |
| `serde` / `serde_json` | `1` | JSON serialization (override config + SystemSnapshot) |
| `sysinfo` | `0.39` (resolved `0.39.3`) | Cross-platform host metrics: CPU/RAM/swap/disks/networks/processes/components |
| `nvml-wrapper` | `0.12` (resolved `0.12.1`) | NVIDIA GPU metrics via NVML (feature `gpu-nvidia`, default-on). Uses `libloading` (runtime dlopen) — `cargo check`/CI without NVIDIA drivers is safe |
| `log` | `0.4` (resolved `0.4.30`) | Logging for NVML graceful-init failure |
| `tokio` | `1` (resolved `1.52.3`) | Async interval timer for background monitoring task |

Capability keys in `capabilities/default.json`:
- `core:default` — base Tauri permissions
- `dialog:default` — all dialog permissions (open/save/message/ask)
- `core:event:default` — allows webview to `listen()` on `"system://metrics"`

**JS bindings for consumers:** `@tauri-apps/plugin-dialog` — NOT a dep/peerDep of `@capsuletech/desktop`. Apps install it directly alongside `@tauri-apps/api`. Rationale: `@capsuletech/desktop` is a build-time library (node process, spawns Tauri); it has no runtime in the webview. The JS plugin bindings live in the webview context of the consuming app. Mixing concerns into `@capsuletech/desktop` peerDeps would create a fake coupling.

**Adding a new Tauri plugin:** (1) add crate dep to `Cargo.toml`, (2) `.plugin(tauri_plugin_X::init())` in `lib.rs`, (3) add `"X:default"` to `capabilities/default.json`, (4) `cargo check` to verify, (5) update this table + OWNERSHIP.md.

**Adding a new GPU provider (Phase B):** (1) add `impl GpuProvider` in `native/src/metrics.rs`, (2) try-init in `build_gpu_providers()` (marked with Phase B comment), (3) update this table. Contract `SystemSnapshot.gpus[]` does NOT change.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `@capsuletech/cli` — action `capsule desktop dev/build` импортирует `runDev`/`runBuild` | owner-cli |
| `@capsuletech/vite-builder` — тип `defineCapsuleConfig.desktop` реэкспортируется | owner-builders |
| `@capsuletech/lib-builder` — vite lib config для `src/` build | owner-builders |
| `backend/scriber/` — sibling Rust crate, отдельный workspace (`backend/Cargo.toml`) | owner-scriber |
| `apps/agent/` — будущий consumer (Tauri desktop для scriber, см. owner-scriber Roadmap PR-4) | будущий app-agent owner |

## Release group

`cli` (fixed versioning, tag `cli@{version}`, добавляется в PR 6):
- `@capsuletech/cli`
- `@capsuletech/compliance`
- `@capsuletech/desktop` _(this package, после PR 6)_
- `@capsuletech/lib-builder`
- `@capsuletech/vite-builder`

(Также `@capsuletech/shared-file-manager` упомянут в owner-cli.md как часть группы, но в `nx.json` отсутствует — drift, не моя зона, эскалация owner-deps.)

После изменений в этом пакете — координировать release через главного:
```bash
pnpm release:local:cli   # Verdaccio publish
```

При breaking change в API `runDev`/`runBuild` — согласовать с owner-cli перед release (cli action ломается на drift'е).

## Связанное

- [ADR 017](../../docs/01-architecture/adr/017-desktop-package.md) — контракт пакета
- [docs/_meta/desktop.md](../../docs/_meta/desktop.md) — AI-anchor (после PR 7)
- [docs/09-backend/desktop.md](../../docs/09-backend/desktop.md) — user-guide для агентов `capsule-agent-app` (после PR 7)
- [CLAUDE.md](../../CLAUDE.md) — POLICY section + Desktop секция (обновляется в PR 8)
- [.claude/agents/owner-desktop.md](../../.claude/agents/owner-desktop.md) — agent definition
- [.claude/agents/owner-scriber.md](../../.claude/agents/owner-scriber.md) — sibling Rust ownership, образец стиля
- [Tauri 2 docs](https://v2.tauri.app/)
