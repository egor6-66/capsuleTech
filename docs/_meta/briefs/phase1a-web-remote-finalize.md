---
title: 'web-remote Phase 1a + 1b finalize — verify WT, commit, PR (singleton + srcdoc importmap)'
status: ready
audience: owner-web-remote
last_updated: 2026-06-22
adr:
  - docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md (consequence 7b, Variant C)
ai-anchor: docs/_meta/web-remote.md
relates:
  - docs/_meta/briefs/phase1a-web-remote-context-singleton.md (design brief, history — Phase 1a singleton)
  - docs/_meta/briefs/phase1a-web-core-finalize.md (parallel — MUST merge BEFORE this PR)
  - PR #398, #399, #412 (merged, baseline)
---

# Контекст

Две связанные задачи **обе реализованы в WT** и складываются в ОДИН PR от owner-web-remote:

1. **Phase 1a — singleton invariant fix** через `tsconfig.base.json` subpath alias (root cause: missing `/capsule` alias → fallback на `dist/` → второй `createContext()` → два `RemoteContext` объекта).
2. **Phase 1b — srcdoc importmap inject** через утилиту `renderSolidImportMapTag` из `@capsuletech/web-core/bootstrap` (closes multi-Solid в iframe; reactive props end-to-end).

Обе живут в одной зоне (web-remote runtime + shared tsconfig.base.json), независимые рабочие — но один логический cohesive PR: «host→canvas user-facing работает».

# Зависимости — STRICT ORDER

⚠️ **ЭТОТ PR МЕРЖИТСЯ ВТОРЫМ.** Сначала на main должен лечь `phase1a-web-core-finalize.md` PR (owner-web-core), потому что `buildSrcdoc.ts` импортирует `renderSolidImportMapTag` из `@capsuletech/web-core/bootstrap`. Без merged web-core PR — CI этого PR падает на typecheck/build.

Architect координирует порядок: web-core merged → architect signals → owner-web-remote finalize'ит свой PR.

# Скоп PR

## Файлы в скоупе (все уже в WT)

**Новые (untracked):**
- `packages/web/runtime/remote/src/runtime/__tests__/dualImport.test.tsx` — 4 case'а singleton invariant (Provider/useRemote shared context через root + capsule subpath)

**Modified:**
- `tsconfig.base.json` — добавлена строка `"@capsuletech/web-remote/capsule": ["packages/web/runtime/remote/src/capsule.ts"]` (cross-zone shared infra, но единственная разумная точка фикса; architect согласует)
- `packages/web/runtime/remote/OWNERSHIP.md` — секция «Module instance singleton invariant» (правило для будущих subpath'ов: каждый новый subpath требует записи в tsconfig.base.json)
- `packages/web/runtime/remote/src/runtime/buildSrcdoc.ts` — импорт `renderSolidImportMapTag`, новые params `hostOrigin` + `solidPaths`, тег `<script type="importmap">` инжектится **первым** в `<head>` (до module-scripts)
- `packages/web/runtime/remote/src/runtime/RemoteComponent.tsx` — пробрасывает `hostOrigin` (и опционально `solidPaths`) в `buildSrcdoc` (verify это в WT)
- `docs/_meta/web-remote.md` — секция singleton-invariant + правило «не убирать import-map / не сдвигать после первого module-script»

# Verify (обязательно перед commit)

1. **Зависимость merged:** перед finalize **убедиться** что web-core PR (phase1a-web-core-finalize) уже на main. `git log --oneline origin/main | grep "web-core"` должен показать его. Иначе typecheck/build упадёт.

2. **Tests:**
   - `pnpm nx run @capsuletech/web-remote:test` — все green, включая новый `dualImport.test.tsx`.
   - **Важное замечание про тест (already documented в файле):** Node/jsdom dedup'ит модули по resolved path — тест НЕ воспроизводит Vite-resolve грань. Это документация API-инварианта, НЕ regression guard для bundler-edge. Real guard = manual e2e в реальном Vite (см. ниже).

3. **Typecheck:**
   - `pnpm nx run-many -t typecheck --projects=@capsuletech/web-remote,@capsuletech/universal-canvas,@capsuletech/playground` — clean. Особенно проверить что `renderSolidImportMapTag` импорт резолвится (subpath `/bootstrap` есть в exports web-core после merged'а первого PR).

4. **Build:**
   - `pnpm nx run @capsuletech/web-remote:build` — clean. `dist/` структура (root index.mjs + capsule.mjs + chunks/) не должна регрессировать.

5. **Lint:**
   - `pnpm lint` clean.

6. **E2E smoke (manual, in real browser — критично для Phase 1b acceptance):**
   - Запустить `apps/playground` через `capsule dev` (+ `apps/universal-canvas` отдельно если требуется по manifest).
   - Открыть `/workspace/<route с Remote.View>`.
   - DevTools → выбрать **iframe** фрейм → Console → проверить: warning `[capsule/solid] You appear to have multiple instances of Solid` **отсутствует**.
   - Network tab в iframe-фрейме: import URL для `solid-js` должен указывать на host origin (parent vite-dev), не на iframe origin.
   - **Singleton smoke:** `useRemote()` (auto-imported per PR #412) внутри `<Remote.Provider>` НЕ бросает «must be called inside RemoteProvider».
   - **Reactive props smoke:** добавить временный `createEffect(() => console.log('pingCount:', ctx.props.pingCount))` в `apps/universal-canvas/src/remote.ts`, на хосте `<Remote.View pingCount={signal()}>` менять signal — iframe-console должен реагировать. **После проверки откатить временный console.log** (либо переоформить как documented smoke-fixture, если зона позволяет).

# Что НЕ в этом PR

- Любые правки `packages/web/runtime/core/*` — это PR-A (зона owner-web-core).
- Cross-origin iframe (Phase 2+) — отдельный ADR.
- Prod-paths override для importmap — текущая дефолтная конфигурация = dev (Vite); prod = Phase 2+.
- `packages/builders/*` изменения в WT — owner-builders зона.

# Commit + PR coordination

1. **Owner-web-remote stage'ит файлы из скоупа явно через `git add <path>`** — НЕ `git add -A`.
2. **Один conventional commit** `feat(web-remote): ...` или `fix(web-remote): ...`.
3. **Зовёт architect'а** на push + PR. Architect делает push (gate marker'ом), opens PR, watches CI, merges после green.

# Acceptance

- [ ] Все verify-чек'и пройдены (включая manual e2e smoke в реальном браузере).
- [ ] PR depends-on зафиксирован в body (для clarity: «Depends on PR #XXX [web-core finalize]»).
- [ ] PR title `^[a-z].+$`.
- [ ] CI gates green.
- [ ] OWNERSHIP.md содержит правило «каждый новый subpath → запись в tsconfig.base.json» как pin для future-self.

# Известные риски

1. **tsconfig.base.json cross-zone touch.** Это shared infra (зона architect'а формально), но логически фикс принадлежит web-remote (его subpath ломает singleton). Architect согласовал координацию: owner-web-remote вносит правку, architect approves on PR review. Commit message должен явно проговорить cross-zone touch + reason.

2. **Manual e2e smoke не автоматизирован.** Playwright harness ещё не готов (зафиксировано в OWNERSHIP.md). Acceptance Phase 1b — manual в DevTools. Это **технический долг** для будущего Phase 2 (e2e infrastructure).

3. **Vite-dev paths могут не совпадать с дефолтами `buildSolidImportMap`** (`/node_modules/solid-js/dist/solid.js`). У Vite-dev обычно `/node_modules/.vite/deps/solid-js.js?v=...`. Если manual smoke ловит wrong-path резолв → передать override `solidPaths` в `buildSrcdoc` через `RemoteComponent`. Это уже параметризовано в WT (judging from buildSrcdoc.ts diff); проверить что override действительно прокидывается.

4. **HMR re-evaluation.** Cached importmap в iframe не пере-эвалит при изменении host solid-js. Сейчас это OK (one-shot iframe-mount). Если в будущем dev-experience ломается — отдельная задача.
