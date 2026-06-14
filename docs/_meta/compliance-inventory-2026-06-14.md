# Compliance inventory — 2026-06-14

Scanned: 114 files in 6 app(s) (ewc, monitoring, nexus, playground, testhub, ui-creator)
Total violations: **192**

## Summary by kind

| Kind | Count | Phase L? |
|---|---|---|
| `raw-class` | 121 | YES |
| `native-jsx` | 51 | YES |
| `native-js` | 9 | YES |
| `disallowed-import` | 6 | no |
| `app-package-import` | 5 | YES |

## Summary by app

| App | Violations |
|---|---|
| nexus | 88 |
| testhub | 32 |
| playground | 30 |
| ewc | 21 |
| ui-creator | 13 |
| monitoring | 8 |

## Top 20 files by violation count

| File | Count |
|---|---|
| `apps/nexus/src/views/systemMonitorCard.tsx` | 29 |
| `apps/testhub/src/views/appList.tsx` | 13 |
| `apps/monitoring/src/pages/index.tsx` | 8 |
| `apps/nexus/src/views/filePickerCard.tsx` | 8 |
| `apps/nexus/src/views/workspaceMenu.tsx` | 8 |
| `apps/nexus/src/widgets/canvas.tsx` | 8 |
| `apps/testhub/src/views/menu.tsx` | 8 |
| `apps/ui-creator/src/views/workspace-menu.tsx` | 8 |
| `apps/playground/src/views/studio/topbar.tsx` | 7 |
| `apps/nexus/src/views/paletteItem.tsx` | 6 |
| `apps/testhub/src/views/appFrame.tsx` | 6 |
| `apps/ewc/src/views/authFormCard.tsx` | 5 |
| `apps/nexus/src/features/metricsSource.ts` | 5 |
| `apps/nexus/src/views/authFormCard.tsx` | 5 |
| `apps/nexus/src/views/statCard.tsx` | 5 |
| `apps/playground/src/pages/workspace/web-studio/index.tsx` | 5 |
| `apps/ewc/src/widgets/header.tsx` | 4 |
| `apps/playground/src/pages/workspace/devops.tsx` | 3 |
| `apps/playground/src/pages/workspace/docs.tsx` | 3 |
| `apps/playground/src/views/studio/inspector.tsx` | 3 |

## Examples by kind (up to 5 each)

### `app-package-import` (5)

- `apps/ewc/src/pages/workspace/cards/index.tsx:1:0` — Runtime-импорт "@capsuletech/web-router" из app-кода запрещён (слой page).
  hint: App собирается через globals (Ui.*/Views.*/Controllers.*/…). Эти namespace инжектятся через unplugin-auto-import — никаких import не нужно. Для типов используй "import type".
- `apps/ewc/src/pages/workspace/cards/[id]/index.tsx:10:0` — Runtime-импорт "@capsuletech/web-router" из app-кода запрещён (слой page).
  hint: App собирается через globals (Ui.*/Views.*/Controllers.*/…). Эти namespace инжектятся через unplugin-auto-import — никаких import не нужно. Для типов используй "import type".
- `apps/ewc/src/pages/workspace/reports/index.tsx:8:0` — Runtime-импорт "@capsuletech/web-router" из app-кода запрещён (слой page).
  hint: App собирается через globals (Ui.*/Views.*/Controllers.*/…). Эти namespace инжектятся через unplugin-auto-import — никаких import не нужно. Для типов используй "import type".
- `apps/nexus/src/views/paletteItem.tsx:1:0` — Runtime-импорт "@capsuletech/boost-flow" из app-кода запрещён (слой view).
  hint: App собирается через globals (Ui.*/Views.*/Controllers.*/…). Эти namespace инжектятся через unplugin-auto-import — никаких import не нужно. Для типов используй "import type".
- `apps/nexus/src/widgets/canvas.tsx:1:0` — Runtime-импорт "@capsuletech/boost-flow" из app-кода запрещён (слой widget).
  hint: App собирается через globals (Ui.*/Views.*/Controllers.*/…). Эти namespace инжектятся через unplugin-auto-import — никаких import не нужно. Для типов используй "import type".

### `disallowed-import` (6)

- `apps/nexus/src/features/filePicker.tsx:20:33` — Import "@tauri-apps/plugin-dialog" не разрешён в слое feature.
  hint: Допустимые в feature: ^solid-js(\/.*)?$, ^xstate(\/.*)?$, ^@xstate\/solid$, ^es-toolkit(\/.*)?$, ^@app\/(api|services)(\/.*)?$, ^@tanstack\/solid-router$.
- `apps/nexus/src/features/metricsSource.ts:171:27` — Import "@tauri-apps/api/core" не разрешён в слое feature.
  hint: Допустимые в feature: ^solid-js(\/.*)?$, ^xstate(\/.*)?$, ^@xstate\/solid$, ^es-toolkit(\/.*)?$, ^@app\/(api|services)(\/.*)?$, ^@tanstack\/solid-router$.
- `apps/nexus/src/features/metricsSource.ts:172:27` — Import "@tauri-apps/api/event" не разрешён в слое feature.
  hint: Допустимые в feature: ^solid-js(\/.*)?$, ^xstate(\/.*)?$, ^@xstate\/solid$, ^es-toolkit(\/.*)?$, ^@app\/(api|services)(\/.*)?$, ^@tanstack\/solid-router$.
- `apps/nexus/src/features/metricsSource.ts:206:29` — Import "@tauri-apps/api/core" не разрешён в слое feature.
  hint: Допустимые в feature: ^solid-js(\/.*)?$, ^xstate(\/.*)?$, ^@xstate\/solid$, ^es-toolkit(\/.*)?$, ^@app\/(api|services)(\/.*)?$, ^@tanstack\/solid-router$.
- `apps/nexus/src/widgets/canvas.tsx:10:0` — Import "lucide-solid" не разрешён в слое widget.
  hint: Допустимые в widget: ^solid-js(\/.*)?$.

### `native-js` (9)

- `apps/ewc/src/features/auth.tsx:46:10` — Прямой доступ к native "localStorage" запрещён в слое feature.
  hint: Используй services (router/utils/api) или Solid primitives (onMount/onCleanup/createEffect). Прямой DOM-доступ блокирует desktop/SSR.
- `apps/ewc/src/features/shell.ts:26:4` — Прямой доступ к native "localStorage" запрещён в слое feature.
  hint: Используй services (router/utils/api) или Solid primitives (onMount/onCleanup/createEffect). Прямой DOM-доступ блокирует desktop/SSR.
- `apps/ewc/src/features/workspace.tsx:18:10` — Прямой доступ к native "localStorage" запрещён в слое feature.
  hint: Используй services (router/utils/api) или Solid primitives (onMount/onCleanup/createEffect). Прямой DOM-доступ блокирует desktop/SSR.
- `apps/nexus/src/features/auth.tsx:54:10` — Прямой доступ к native "localStorage" запрещён в слое feature.
  hint: Используй services (router/utils/api) или Solid primitives (onMount/onCleanup/createEffect). Прямой DOM-доступ блокирует desktop/SSR.
- `apps/nexus/src/features/boot.tsx:20:22` — Прямой доступ к native "localStorage" запрещён в слое feature.
  hint: Используй services (router/utils/api) или Solid primitives (onMount/onCleanup/createEffect). Прямой DOM-доступ блокирует desktop/SSR.

### `native-jsx` (51)

- `apps/nexus/src/views/filePickerCard.tsx:16:4` — Native HTML tag "<div>" запрещён в слое view.
  hint: Используй Ui.Layout.Flex / Ui.Layout.Grid / Ui.Layout.Box. Если нужного примитива нет — расширь @capsuletech/web-ui, не пиши нативу руками.
- `apps/nexus/src/views/filePickerCard.tsx:18:6` — Native HTML tag "<div>" запрещён в слое view.
  hint: Используй Ui.Layout.Flex / Ui.Layout.Grid / Ui.Layout.Box. Если нужного примитива нет — расширь @capsuletech/web-ui, не пиши нативу руками.
- `apps/nexus/src/views/paletteItem.tsx:13:4` — Native HTML tag "<button>" запрещён в слое view.
  hint: Используй Ui.Button. Если нужного примитива нет — расширь @capsuletech/web-ui, не пиши нативу руками.
- `apps/nexus/src/views/paletteItem.tsx:23:6` — Native HTML tag "<span>" запрещён в слое view.
  hint: Используй Ui.Layout.Inline / Ui.Typography.Text. Если нужного примитива нет — расширь @capsuletech/web-ui, не пиши нативу руками.
- `apps/nexus/src/views/statCard.tsx:19:10` — Native HTML tag "<span>" запрещён в слое view.
  hint: Используй Ui.Layout.Inline / Ui.Typography.Text. Если нужного примитива нет — расширь @capsuletech/web-ui, не пиши нативу руками.

### `raw-class` (121)

- `apps/ewc/src/pages/workspace/cards/index.tsx:26:42` — Raw class на JSX-узле запрещён в слое page.
  hint: Передавай через props на Ui.* primitive (variant/size/padding/gap/…). Если нужного prop нет — расширь kit-primitive в @capsuletech/web-ui.
- `apps/ewc/src/pages/workspace/map/index.tsx:2:18` — Raw class на JSX-узле запрещён в слое page.
  hint: Передавай через props на Ui.* primitive (variant/size/padding/gap/…). Если нужного prop нет — расширь kit-primitive в @capsuletech/web-ui.
- `apps/ewc/src/pages/_public/index.tsx:13:50` — Raw class на JSX-узле запрещён в слое page.
  hint: Передавай через props на Ui.* primitive (variant/size/padding/gap/…). Если нужного prop нет — расширь kit-primitive в @capsuletech/web-ui.
- `apps/ewc/src/views/authFormCard.tsx:11:8` — Raw class на JSX-узле запрещён в слое view.
  hint: Передавай через props на Ui.* primitive (variant/size/padding/gap/…). Если нужного prop нет — расширь kit-primitive в @capsuletech/web-ui.
- `apps/ewc/src/views/authFormCard.tsx:13:18` — Raw class на JSX-узле запрещён в слое view.
  hint: Передавай через props на Ui.* primitive (variant/size/padding/gap/…). Если нужного prop нет — расширь kit-primitive в @capsuletech/web-ui.
