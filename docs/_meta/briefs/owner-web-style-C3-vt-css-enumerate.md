---
title: owner-web-style — Phase C3 brief
description: CSS селекторы enumerate для depth-scoped view-transition (ADR 046 D4). Финализирует C-track плана.
status: documented
last_updated: 2026-06-11
---

# Brief — owner-web-style — Phase C3 (vt-name CSS enumerate)

> **READ FIRST:** `docs/_meta/owner-agent-canon.md` — общие правила для owner-* агентов.
> **Plan-doc:** `docs/_meta/web-rework-plan.md` → Phase C3.

## Цель {#goal}

Закрыть C-трек depth-scoped routing-animation. C1 (`CapsuleOutlet` + `DepthContext`) и C2 (`Ui.Outlet` swap в Page+Widget wrappers через CapsuleOutlet alias) уже в main (#304, #305). Каждый Outlet-уровень эмитит `view-transition-name: capsule-content-${depth}`. CSS-движок должен **уметь анимировать каждое имя независимо**.

Сейчас `packages/web/style/src/index.css` содержит селекторы только для `capsule-content` (без depth). После C1+C2 они НЕ срабатывают на новые depth-имена → degraded animation для consumer'ов.

## Что делать {#action}

### 1. Расширить блок `.vt-route-content` в `packages/web/style/src/index.css`

Цель: enumerate селекторы `::view-transition-old(capsule-content-{0..3})` + `::view-transition-new(capsule-content-{0..3})` с теми же animation properties, что и текущий single `capsule-content`. Плюс сохранить **legacy fallback** на голое `capsule-content` (для consumer'ов которые ещё не обновили web-core).

Примерный shape (точные animation properties — те что у текущего блока):

```css
/* Per-depth animations — enumerated, pattern-glob НЕ кроссбраузерно стабилен */
::view-transition-old(capsule-content-0),
::view-transition-new(capsule-content-0),
::view-transition-old(capsule-content-1),
::view-transition-new(capsule-content-1),
::view-transition-old(capsule-content-2),
::view-transition-new(capsule-content-2),
::view-transition-old(capsule-content-3),
::view-transition-new(capsule-content-3) {
  /* ...текущие свойства из блока capsule-content... */
}

::view-transition-group(capsule-content-0),
::view-transition-group(capsule-content-1),
::view-transition-group(capsule-content-2),
::view-transition-group(capsule-content-3) {
  /* ...current group settings... */
}

/* Legacy fallback (single-Outlet consumers до CapsuleOutlet) */
::view-transition-old(capsule-content),
::view-transition-new(capsule-content) {
  /* same as per-depth */
}
```

**Потолок 0..3** — выбран как разумный максимум вложенности роутов в реальных capsule-аппах. Если apps уйдут глубже — добавить ещё один уровень в follow-up PR.

### 2. Обновить OWNERSHIP

`packages/web/style/OWNERSHIP.md` — секция «Состояние» / «Публичный API» / «Quirks»:
- Отметить что vt-name CSS enumerate-канон 0..3 + fallback внедрён.
- Пометить Decision 4 ADR 046 как реализованный со стороны web-style.
- Update `last-updated`.

### 3. Тесты — не обязательно

CSS-only изменение, jsdom его не валидирует. Manual smoke после merge'а в любом capsule-аппе с вложенными роутами (например `apps/playground/workspace/web-studio/*`) — но это USER зона (parallel WIP в этих роутах).

## PR {#pr}

- **Title:** `feat(web-style): enumerate vt-name selectors for capsule-content-{0..3} (adr 046 D4 / Phase C3)`
- **Не начинать subject с uppercase / digit / `@`** ([[pr-title-pattern]]).
- **Base:** main.
- **CI:** Lint + Typecheck + Build (+ Test если конфиг есть). Ownership canon должен пройти если OWNERSHIP правильно обновлён.

## Constraints {#constraints}

- **Zone:** `packages/web/style/`. Не трогать web-router (#304 закрыл) / web-core (#305 закрыл) / apps/*.
- **Никогда `git add -A` / `git restore`** ([[no-blanket-restore]]). Explicit paths.
- **Parallel WIP в дереве** (playground / auth / menu / backend) — не моя зона, не коммитить.
- **Lockfile** не трогать (CSS-only).

## Refs {#refs}

- [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] D4 — CapsuleOutlet vt-name canon.
- PR #304 — C1 CapsuleOutlet + DepthContext.
- PR #305 — C2 Ui.Outlet swap framework.
- `docs/_meta/web-zones/runtime.md` — runtime zone canon (web-style — runtime).
- `docs/_meta/web-style.md` — AI-anchor.
