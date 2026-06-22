---
title: 'fix(web-remote): bootUrl resolution must be layout-independent (dev src + prod dist)'
status: ready
audience: owner-web-remote
last_updated: 2026-06-22
relates:
  - PR #413 (merged) — singleton invariant fix через tsconfig alias обнажил эту проблему
  - PR #398 (merged) — baseline canvas→host smoke который сейчас сломан в dev
ai-anchor: docs/_meta/web-remote.md
---

# Контекст (только факты, верифицированные в браузере 2026-06-22)

Manual smoke: `apps/playground` через `capsule dev` на `http://localhost:3050`. Iframe для `apps/universal-canvas` пытается загрузить boot:

```
GET http://localhost:3050/@fs/D:/CODING/projects/my/capsule/packages/web/runtime/remote/src/boot.mjs
net::ERR_ABORTED 404 (Not Found)
```

Iframe не стартует. Canvas вообще не работает.

## Почему сломалось — структурно

`packages/web/runtime/remote/src/runtime/RemoteComponent.tsx:35`:

```ts
const bootUrl = new URL('../boot.mjs', import.meta.url).href;
```

Эта строка делает **предположение о layout**: «RemoteComponent живёт в `dist/chunks/`, `boot.mjs` — sibling в `dist/`». В prod build так и есть → работает.

В dev до PR #413: `/capsule` subpath НЕ имел alias в `tsconfig.base.json` → Vite fallback на `package.json#exports` → грузил `dist/capsule.mjs` → `RemoteComponent` приходил из dist → `import.meta.url` указывал на dist → `../boot.mjs` = `dist/boot.mjs` (sibling) → работало случайно.

PR #413 добавил alias `/capsule → src/capsule.ts`. Это **архитектурно правильно** — закрыло singleton invariant (один `RemoteContext` объект, `useRemote()` под Provider работает). Но обнажило **pre-existing fragility**: `bootUrl`-резолюция полагалась на dist-layout, который теперь не подгружается в dev.

## ЧТО НЕ ОТКАТЫВАТЬ

`tsconfig.base.json` alias `@capsuletech/web-remote/capsule → src/capsule.ts` **должен остаться**. Это singleton invariant — без него `useRemote()` под `<Remote.Provider>` снова бросает «must be called inside RemoteProvider». Это закрытый Phase 1a баг, его не пересматриваем.

# Скоп

**Один источник правды** — RemoteComponent должен резолвить boot URL так, чтобы он работал **независимо** от того, откуда грузится сам RemoteComponent (src в dev / dist в prod). Никаких layout-предположений.

Только `packages/web/runtime/remote/*` — твоя зона.

# Step 0 — диагностика ДО фикса (обязательно)

Комментарий в `RemoteComponent.tsx:33`:
> Previous form (?url) inlined src/shell/boot.ts as data:video/mp2t base64, which browsers refuse to load as an ESM module.

Это **historical note**, не свежий факт. **Перепровь** актуальную ситуацию:

1. **Найди исходник boot.** Скорее всего `packages/web/runtime/remote/src/shell/boot.ts` (по комменту) или похожий путь. Подтверди:
   ```
   ls D:/CODING/projects/my/capsule/packages/web/runtime/remote/src/shell/
   ```
   
2. **Найди как boot.mjs появляется в dist** — отдельный Vite entry в `vite.config.mts`? `?url` import? Vite-плагин копирования? Зафиксируй точный механизм текущего build pipeline.

3. **Воспроизведи `?url` regression.** Попробуй временно:
   ```ts
   import bootUrl from '../shell/boot.ts?url';
   ```
   (или какой реальный путь). Запусти `capsule dev` в `apps/playground`. Network tab → проверь что Vite возвращает для этого URL.
   
   - Если возвращается `data:video/mp2t...` MIME — баг подтверждён, диагностируй ПОЧЕМУ (Vite version? `.ts` extension issue? assetsInclude config?).
   - Если возвращается нормальный ESM module — comment в коде устарел, можно использовать `?url`.

4. **Зафиксируй root cause** в commit message и/или OWNERSHIP.md. Не «починили на удачу», а «X было причиной, Y закрывает».

# Что делать после диагностики

Фикс должен соответствовать диагностике. Возможные направления (НЕ выбираешь произвольно, а следуешь root cause):

- Если `?url` работает корректно в актуальном Vite — переходи на `?url` import. Удали runtime URL construction. Comment в коде обнови.
- Если `.ts` extension даёт wrong MIME — попробуй переименовать source в `.mts` (или `.js`/`.mjs`) и обнови vite.config.mts entries соответственно.
- Если Vite-конфиг (assetsInclude / esbuild loader) даёт wrong MIME — поправь конфиг.
- Если проблема в build pipeline (boot.mjs не попадает в dev-server'у) — поправь pipeline.

**Принцип**: чинить причину, а не симптом. Никаких `if (import.meta.env.DEV) ... else ...` ветвлений в RemoteComponent — это hack, который вернёт нас к layout-assumption через год.

# Acceptance

- [ ] `capsule dev` в `apps/playground` запускается без ошибок.
- [ ] Iframe для `apps/universal-canvas` загружается, boot.mjs (или эквивалент) резолвится корректно — нет 404 в Network tab.
- [ ] Console iframe: `[universal-canvas] bootstrap (createCapsuleApp)` присутствует.
- [ ] `mounted` событие приходит на host (canvas→host smoke baseline PR #398 восстановлен).
- [ ] `useRemote()` внутри `<Remote.Provider>` НЕ бросает (singleton фикс PR #413 НЕ регрессирует).
- [ ] Multi-Solid warning отсутствует в iframe console (Phase 1b importmap фикс PR #413 НЕ регрессирует).
- [ ] `pnpm nx run @capsuletech/web-remote:test` — clean.
- [ ] `pnpm nx run-many -t typecheck --projects=@capsuletech/web-remote,@capsuletech/universal-canvas,@capsuletech/playground` — clean.
- [ ] `pnpm nx run @capsuletech/web-remote:build` — clean, dist структура корректна (boot.mjs на своём месте для prod).
- [ ] `pnpm lint` — clean.
- [ ] Документ в OWNERSHIP.md / docs/_meta/web-remote.md фиксирует: «boot resolution использует X механизм; layout-assumption через `../boot.mjs` НЕ возвращать, корневой кейс — Y».

# Что НЕ трогать

- `tsconfig.base.json` (singleton fix должен остаться).
- `packages/web/runtime/core/*` (зона owner-web-core).
- `packages/builders/vite/*` (зона owner-builders) — если механизм требует правок Vite-плагина, **STOP** и сообщи architect'у; будет отдельный coordinated PR через owner-builders.
- `apps/universal-canvas/*` (apps scope) — boot resolution должен работать без правок consumer'а.

# Процедура коммита

## Pre-flight — только verify, не switch

Архитектор УЖЕ привёл shared working tree в нужное состояние: HEAD = main, fast-forwarded до коммита `45289304` (PR #413 merged, включает singleton alias-фикс). Твоя сессия живёт в той же `.git` — никаких git ops по переключению/pull тебе делать НЕ нужно (gate их в любом случае заблокирует — это by design, не баг).

Подтверди что видишь то же:
```bash
git -C D:/CODING/projects/my/capsule rev-parse --abbrev-ref HEAD
# ожидается: main

git -C D:/CODING/projects/my/capsule log --oneline -3
# ожидается первая строка: 45289304 feat(web-core, web-remote): host-canvas phase 1a finalize ...

git -C D:/CODING/projects/my/capsule status --short
# ожидается: только untracked брифы в docs/_meta/briefs/ — никаких modified в твоей зоне.
```

Если выводы **не** совпадают — STOP, сообщи architect'у. Это рассинхрон shared tree, его лечит architect, не ты.

## Commit (после фикса + всех verify-шагов acceptance)

```bash
git -C D:/CODING/projects/my/capsule add <конкретные пути из твоей зоны packages/web/runtime/remote/*>
git -C D:/CODING/projects/my/capsule commit -m "fix(web-remote): bootUrl resolution layout-independent (Step 0 root cause: <X>)

<тело commit message с описанием диагностики и фикса>"
```

**НЕ push.** Push режется git-gate'ом для не-main сессии (это правильное поведение, не ошибка). Push делает architect.

## После коммита

STOP. Сообщи architect'у в чате:
- SHA коммита
- Что диагностировал в Step 0 (конкретный root cause)
- Что починил
- Результат smoke в браузере: галочки по acceptance, своими глазами

Architect создаёт feature-ветку (`git switch -c` доступен только main scope), push'ит, открывает PR, мерж после CI green.

# Если что-то непонятно

STOP, сообщи architect'у. НЕ улучшай scope. НЕ трогай файлы вне своей зоны. НЕ переключай ветки. НЕ push.

Канон: `feedback_no_hypotheses_diagnose_with_tools`, `feedback_root_cause_before_fix`, `feedback_canon_modules_no_crutches`, `feedback_agents_commit_only_user_pushes`.
