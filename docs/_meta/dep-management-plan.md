---
title: Dependency Management Plan
status: proposed
last-updated: 2026-05-20
---

# Dependency Management Plan

План усиления гигиены зависимостей. Возник после первой репетиции publish в `capsule-test` (2026-05-20), которая вытащила класс багов «leaf-пакет молча хойстит из root», «published tarball не имеет subpath», «generated файлы импортят пакеты которых нет в app's node_modules», «xstate CJS interop ломается без явной installed dep».

## Что уже сделано (sweep PR #91, #92)

- Каждый leaf-пакет (`packages/builders/*`, `packages/web/*`) declare'ит то что реально импортит — в `peerDependencies` (singletons: `solid-js`, `xstate`, `@kobalte/core`, `@tanstack/*`) или `dependencies`.
- Root `package.json` держит **только** tooling (vite, biome, nx, tailwind, verdaccio, ts).
- CLI app template содержит direct deps включая `@tanstack/solid-router`, `xstate`, `@xstate/solid` — потому что generated файлы (`.capsule/routes/*.tsx`, deps Vite optimizeDeps) импортят эти пакеты **из app's node_modules**, и `auto-install-peers` не делает symlink на app-уровне для глубоких peer-цепочек.
- `.npmrc` template имеет `auto-install-peers=true` явно.
- vite-builder peer `vite` расширен до `^5 || ^6 || ^7 || ^8`.

## Чего sweep НЕ ловит

- **Release pipeline drift** — stale tarball в Verdaccio, tag mismatch (`local` vs `latest`), release-local не релизит cross-group deps атомарно. Sweep лечит код, но не **публикацию**.
- **Singleton range drift** — web-core `solid-js: ^1.9.5` vs web-ui `^1.9.0`. Пройдёт ревью, разъедется при публикации.
- **Source ↔ package.json mismatch** — `import X` есть в коде, `X` нет в `package.json` (наш случай с CVA в web-ui и `@babel/*` в compliance).
- **Lockfile drift** между PR.

Без e2e CI который воспроизводит сценарий «первый внешний пользователь» (`capsule init && pnpm install && pnpm dev`), все эти баги уйдут в prod.

## План

### Phase 1 — Закрыть release-pipeline (~1 неделя)

Это **самое важное**. Эта фаза решает 80% наших текущих болей.

- [ ] **e2e CI step**: `capsule init __smoke && cd __smoke && pnpm install && pnpm -r build && timeout 30 pnpm dev` (kill после 30s, проверка отсутствия 503). Один job в GitHub Actions, ~3-5 минут. Воспроизводит scenario первого пользователя.
- [ ] **release-local fixes**:
  - default tag → `latest` (не `local`) — иначе pnpm `@capsuletech/X@latest` берёт stale.
  - убедиться `--group=all` действительно публикует обе группы атомарно с одним timestamp.
  - падать сразу если хотя бы один пакет одной группы зафейлил build.
- [ ] **`docs/_meta/dep-overrides.md`** — каждая запись `pnpm.overrides` / `packageExtensions` с полями:
  - что override'им и почему (link на upstream issue)
  - условие выхода (релиз X)
  - last-checked date

Сейчас в overrides 1 запись (`solid-js: 1.9.12`) — заведём документ сразу с ней.

### Phase 2 — Source ↔ package.json gate (~1 неделя)

- [ ] **knip** — конфиг с явными entry-points (vite-плагины, `*.config.ts`, jiti-loaded `capsule.app.ts`), CI step `knip`. Ловит `import X` без declare и unused deps.
- [ ] **syncpack** — конфиг на ~6 singletons (`solid-js`, `xstate`, `zod`, `vite`, `@tanstack/solid-router`, `@kobalte/core`), CI step `syncpack lint`. Жёсткий sync только для них.

### Phase 3 — Lockfile + dedupe (~копейки)

- [ ] **`pnpm install --frozen-lockfile`** в CI (если ещё нет — проверить).
- [ ] **`pnpm dedupe --check`** в CI — падает на дубликатах solid-js / xstate когда @kobalte/* затаскивает свой peer-range.

### Phase 4 — Auto-upgrade (~по готовности фаз 1-3)

- [ ] **Renovate** с `groupName`:
  - `solid-js + @solidjs/*` — одним PR.
  - `@tanstack/*` — одним PR.
  - `@kobalte/*` — одним PR.
  - `xstate + @xstate/*` — одним PR.

Без e2e CI и knip+syncpack — Renovate будет лить PR'ы которые проходят через сломанный gate. Поэтому **последним**.

### Phase 5 — Cosmetic (~опционально)

- [ ] Миграция оверрайдов на `pnpm.packageExtensions` где причина — отсутствующий peer в upstream (unplugin-dts → @vue/language-core кейс). Чище чем глобальные overrides.

## Связанные документы {#related}

- [[release-checklist]] — текущий процесс публикации (обновить после Phase 1).
- ADR-XXX — добавить ADR про "declare-what-you-import" rule после Phase 2 (когда правило enforced linter'ом).

## История

- **2026-05-20** — план создан после release rehearsal'а в capsule-test, который вытащил 5+ peer-deps багов подряд (compliance @babel/*, web-ui CVA, web-core zod, app generated routes, xstate CJS interop). Sweep PR'ы #91 + #92 закрыли code-level часть, эта плита покрывает остальное.
