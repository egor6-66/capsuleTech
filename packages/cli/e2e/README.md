# CLI E2E Smoke Test

Single-script smoke test of the full **prod-сценария первого пользователя**:

```
pnpm test:e2e:cli   # from monorepo root
```

или прямо:

```
node packages/cli/e2e/smoke.mjs
```

## What it does

1. Cleanup `fixture/` directory.
2. `CAPSULE_CI=1 capsule create workspace` (no TUI).
3. `pnpm install` — workspace dependencies from Verdaccio.
4. `CAPSULE_CI=1 capsule create app e2e-app`.
5. `pnpm install` — app dependencies.
6. Start `pnpm dev` in `apps/e2e-app`, wait for `Local: http://localhost:<port>`.
7. Fetch `/` — expect HTTP 200 with `#root` div.
8. Kill dev server.

Exit code `0` = full chain green. Non-zero exit prints the failed step.

## Prerequisites

- **Verdaccio запущен** на `http://localhost:4873` (`pnpm verdaccio:registry` в отдельном терминале).
- **@capsuletech/* опубликованы** (`pnpm release:local:all`).

Если Verdaccio пустой → `pnpm install` упадёт → smoke fail на шаге 2.

## Why not `capsule-test/` repo

`packages/cli/e2e/fixture/` is **disposable** — script wipes it each run. `capsule-test/` is your manual playground for ongoing development. Fixture is for **CI-style verification before release**.

## Adding scenarios

Phase 1 (current): minimal init → dev → curl.

Phase 2 (planned):
- `capsule create page workspace` → verify route generated → curl `/workspace`.
- `capsule create widget hero` + `capsule create entity hello`.
- `capsule build` → verify dist artifacts.

Add new steps inside `smoke.mjs` (`await step('name', async () => {...})`).
