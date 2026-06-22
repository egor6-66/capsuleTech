---
title: 'web-core Phase 1a finalize — verify WT, commit, PR (createCapsuleApp + EmitProvider + useEmit→sink)'
status: ready
audience: owner-web-core
last_updated: 2026-06-22
adr:
  - docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md (consequences 7a, 7b)
ai-anchor: docs/_meta/web-core.md
relates:
  - docs/_meta/briefs/phase1a-web-core-create-capsule-app.md (design brief, history)
  - docs/_meta/briefs/phase1a-web-remote-finalize.md (parallel — must merge AFTER this PR)
  - PR #398, #399, #412 (already merged, baseline)
---

# Контекст

Phase 1a реализация **уже в working tree** — на main только merged'ы PR #398/#399/#412. Этот бриф ведёт через **верификацию + коммит + PR**, никакого нового кода писать не надо.

Финальный гэп `useEmit` → `EmitContext` (выявленный архитектором при предыдущем ревью) уже закрыт в WT — `engine/emit-context.ts` отделён в нижний слой, `useEmit` его консьюмит. Это **лучше** изначальной спецификации (которая хотела импорт engine → bootstrap) — ссылка в нижний слой чистее по графу.

# Скоп PR

ОДИН PR от owner-web-core: всё реализованное Phase 1a + finalization. После merge unblock'ает owner-web-remote finalize (зависит от `@capsuletech/web-core/bootstrap` subpath).

## Файлы в скоупе (все уже в WT)

**Новые (untracked):**
- `packages/web/runtime/core/src/bootstrap/index.ts` — barrel субпуть `/bootstrap`
- `packages/web/runtime/core/src/bootstrap/createCapsuleApp.tsx` — unified bootstrap
- `packages/web/runtime/core/src/bootstrap/EmitProvider.tsx` — embedded useEmit routing
- `packages/web/runtime/core/src/bootstrap/solidBundleShim.ts` — `buildSolidImportMap` / `renderSolidImportMapTag` утилиты (для web-remote consumer'а)
- `packages/web/runtime/core/src/bootstrap/__tests__/createCapsuleApp.test.tsx`
- `packages/web/runtime/core/src/bootstrap/__tests__/EmitProvider.test.tsx`
- `packages/web/runtime/core/src/bootstrap/__tests__/solidBundleShim.test.ts`
- `packages/web/runtime/core/src/engine/emit-context.ts` — `EmitContext` + `IEmitSink` + `useEmitSink` (нижний слой)
- `packages/web/runtime/core/src/engine/__tests__/use-emit-sink.test.ts`

**Modified:**
- `packages/web/runtime/core/package.json` — добавлен subpath `/bootstrap` в exports
- `packages/web/runtime/core/vite.config.mts` — добавлен bootstrap entry
- `packages/web/runtime/core/src/engine/use-emit.ts` — читает sink из EmitContext, forward в `sink?.send(eventName, partial?.payload)` после локального dispatch
- `docs/_meta/web-core.md` — gotchas #33-#35 (createCapsuleApp, EmitProvider, multi-Solid)

**Cross-zone consumer (включается в этот PR):**
- `apps/universal-canvas/src/remote.ts` — переписан на `createCapsuleApp({ routeTree, appConfig, configOverride, runtimeProps, eventSink })`. Это smoke-consumer; жить в этом PR оправдано (ADR-053 7a).

# Verify (обязательно перед commit)

1. **Архитектурная корректность графа импортов.** `engine/emit-context.ts` живёт в нижнем слое; `bootstrap/EmitProvider.tsx` импортирует **сверху-вниз** через `../engine/emit-context` (правильное направление). `engine/use-emit.ts` импортирует sibling `./emit-context`. Никаких engine → bootstrap импортов нет.

2. **Tests:**
   - `pnpm nx run @capsuletech/web-core:test` — clean (все 3 новых test-файла зелёные + регрессия по существующим).
   - Конкретно убедиться: `use-emit-sink.test.ts` покрывает (a) standalone (sink undefined) → no-op forward; (b) embedded (sink задан) → `sink.send` вызывается + локальный dispatch работает; (c) sink установлен через `<EmitProvider eventSink={mockSink}>` (а не transparent wrapper); (d) `sink.send` ошибки не ломают локальный return.

3. **Typecheck:**
   - `pnpm nx run-many -t typecheck --projects=@capsuletech/web-core,@capsuletech/universal-canvas` — clean.

4. **Build:**
   - `pnpm nx run @capsuletech/web-core:build` — dist/bootstrap.mjs создаётся (или как указано в vite.config.mts), exports в package.json резолвятся.

5. **Subpath import smoke:**
   ```ts
   import { createCapsuleApp, EmitProvider, renderSolidImportMapTag } from '@capsuletech/web-core/bootstrap';
   ```
   В test-fixture либо `apps/universal-canvas/src/remote.ts` (уже использует) — должно type-check'аться без `// @ts-ignore`.

6. **Lint:**
   - `pnpm lint` — clean (biome на staged файлах).

7. **AI-anchor sanity:** `docs/_meta/web-core.md` gotchas #33-#35 описывают **актуальное** поведение в WT (не старое из design-брифа).

# Что НЕ в этом PR (не трогать)

- `packages/web/runtime/remote/*` изменения — отдельная зона owner-web-remote, отдельный PR (`phase1a-web-remote-finalize.md`).
- `tsconfig.base.json` — owner-web-remote зона (singleton fix), не лезть.
- `packages/builders/*` изменения в WT — owner-builders зона (это biome auto-format + alphabetic re-order), отдельный коммит.
- `packages/web/kit/ui/*` изменения — наследие предыдущей сессии, не имеет отношения к remote — оставить, не committed.
- `apps/universal-canvas/src/views/hello.tsx`, `apps/universal-canvas/tsconfig.json` — мелочёвка, оставить как есть.

# Commit + PR coordination

1. **Owner-web-core stage'ит файлы из «скоупа» выше через явный `git add <path>`.** НИКАКОГО `git add -A` / `git add .` (см. memory `feedback_shared_branch_parallel_agent`).
2. **Owner делает `git commit`** с conventional-commit message. Перед коммитом перечитывает `feedback_agents_commit_only_user_pushes`: agent делает только commit, push делает architect.
3. **Зовёт architect'а на push + PR**. Architect:
   - pre-push hook (`nx affected test+build`) — если красно, диагностируем причину, не bypass'им.
   - opens PR с conventional title (`feat(web-core): ...`) и подробным body.
   - watches CI checks (Lint / Typecheck / Test / Build / Compliance / Semantic title / Ownership canon / Docs build).
   - `gh pr update-branch` если main ушёл вперёд.
   - merges squash после green CI.
4. **После merge**: architect фиксит current-checkpoint + кидает сигнал owner-web-remote что его finalize unblocked.

# Acceptance (PR ready criteria)

- [ ] Все verify-чек'и пройдены.
- [ ] Один conventional commit, не «куча всего».
- [ ] PR title `^[a-z].+$` (memory `feedback_pr_title_pattern`).
- [ ] Cross-zone touch `apps/universal-canvas/src/remote.ts` упомянут в body как smoke-consumer (обоснование).
- [ ] CI gates green.

# Известные риски

1. **Multi-Solid сам по себе НЕ устранён этим PR.** `solidBundleShim` утилиты опубликованы, но применяет их `buildSrcdoc.ts` в зоне owner-web-remote (parallel PR). До merge'а ОБОИХ PR'ов — multi-Solid warning сохраняется, reactive props не работают end-to-end. Это OK для этого PR — он закрывает ИНФРАСТРУКТУРНЫЙ кусок (helpers + EmitContext); applied fix приходит вторым PR'ом owner-web-remote.

2. **Cross-zone `apps/universal-canvas/src/remote.ts`** в этом PR — формально нарушение «per-package PR» канона, но логически обосновано: новая публичная сигнатура `createCapsuleApp` требует одновременного обновления единственного consumer'а (smoke), иначе main фрозится в недокументированном промежуточном состоянии. Memory `feedback_git_scope_by_change_shape`: «cross-package фича/баг → per-feature/bug PR».

3. **package.json#exports + vite.config.mts** изменения требуют пересборки потребителей. После merge нужен `pnpm install` + рестарт dev-servers (как обычно при изменении subpath exports).
