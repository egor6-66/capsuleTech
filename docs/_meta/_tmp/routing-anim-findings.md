---
title: routing-anim-findings
description: Временная записка для архитектора — наблюдения по routing-animation треку (Phase C1+C2 done, C3 in flight). Удалить после прочтения / inкорпорации.
status: temporary
audience: architect
author: claude (main steward — C1 owner-web-router в этой сессии)
date: 2026-06-11
---

# Routing-animation rework — findings + follow-ups

> Контекст: ADR 046 Decision 4 + Phase C plan-doc. **C1 (PR #304) + C2 (PR #305) + C3 (PR #309) merged.** Routing-animation track функционально полный. Ниже — что заметил по дороге, что требует касания за пределами routing-зоны, что чисто app-cosmetic.

## 1. Закрытые в C3 + остаточные следствия

### 1.1 Class-rule `.vt-route-content` — **сохранён** owner-web-style'ом как legacy opt-in (PR #309)

`web-style/src/index.css:582-584` (после C3):

```css
.vt-route-content { view-transition-name: capsule-content; }
```

Решение owner-web-style: оставить как fallback для консьюмеров pre-CapsuleOutlet (документировано в комменте «legacy/manual opt-in для apps that manage the wrapper themselves»).

**Следствие — `_public/index.tsx:12` остаётся cosmetic-дублем (app-зона).** На login DOM имеет два узла с `vt-route-content`:
- внешний Flex → claim'ит legacy `capsule-content` (через class-rule);
- внутренний CapsuleOutlet div → claim'ит `capsule-content-0` (inline-override).

Имена разные → коллизии нет → функционально OK (browser fade'ит обе названные регионы пo C3 selectors'ам, оба попадают в `capsule-content` / `capsule-content-0`). Но Flex держит лишний legacy claim. **Косметика app-уровня — drop `vt-route-content` из class'а в `_public/index.tsx:12`** (одна правка, не координированная — web-style class-rule остаётся для тех, кто его явно хочет). **Owner — user playground.**

### 1.2 Глубина enumerate — owner-web-style выбрал 0..3 (PR #309)

`view-transition-old/new/group` селекторы перечислены для `capsule-content-{0,1,2,3}`. **Head-room до 0..6 отвергнут.**

Apps с роутами глубиной 5+ получат browser-default fade (без brand timing) на самых глубоких уровнях. **Follow-up:** при первом app'е с depth-4 — одна строка в каждый из трёх блоков `index.css` (две минуты owner-web-style). Не блокер.

## 2. App-зона follow-ups (не routing-фреймворк)

### 2.1 `apps/playground/src/pages/workspace/web-studio/index.tsx` — main-slot всё ещё `<div>wdad</div>`

Все 5 слотов (header/sidebar/main/rightBar/footer) — `<div>wdad</div>`. **Главный**: `main: <div>wdad</div>` блокирует рендер дочерних `design/logic/monitor` роутов. **Исходный баг ADR 046 Problem 4 (nested workspace → web-studio nested transition) — НЕ верифицируется браузерно**, пока main не вернёт `<Ui.Outlet/>`.

C2 PR #305 явно отметил: «playground patch — пользователь делает в своей ветке». Это знание архитектору — **финальная visual-проверка ADR 046 D4 ждёт этой правки**.

### 2.2 `_public/index.tsx:12` — drop manual `vt-route-content` class

См. (1.1). После того как class-rule в web-style уйдёт, формально app-узел перестанет создавать фейковый legacy-регион. Координация: app-правка должна следовать за web-style-правкой, иначе одну сессию login будет без fade'а вообще.

## 3. Архитектурные наблюдения (cold — на будущее)

### 3.1 `useRouteDepth` impl-rewrite vs contract-preserve

Контракт `Accessor<number>` сохранён, **но семантика поменялась**: раньше hook возвращал глобальную max-depth, теперь — local-Outlet depth. Сигнатура совместима, but consumers, которые **полагались на old-семантику** (если такие были), получат другой ответ молча.

Аудит сейчас: в коде ОДИН consumer — `web-shell/src/matrix/cell.tsx` (PR #298 wire, broken по сути). После C2 он Matrix-Cell всё ещё имеет вызовы useRouteDepth? Проверить нужно при следующем касании web-shell. Если да — это **остаток старого подхода**, не имеет смысла после CapsuleOutlet ownership. Это **owner-web-shell зона** (Phase W2 / W3 могли уже задеть). Не блокер для routing-треков, но засевший вызов будет возвращать локальный depth Matrix-cell (не workspace-level, как изначально задумано) → потенциальный confusion при ADR 046 Phase B2 evict.

### 3.2 TanStack `<Outlet/>` remount edge

В C1 brief я флагнул маяк: если TanStack remount'ит Outlet при навигации (не только children), наш `DepthContext.Provider` пере-маунтится → context value пересоздаётся для каждой навигации. В моих unit-тестах (jsdom, без реального router state machine) это не воспроизводится. **Браузер-проверка только на реальном TanStack navigation flow.** Когда (2.1) закроется и web-studio sub-routes заработают — это и есть тест-кейс.

Если эффект найдётся (depth «прыгает» между свопами, или Provider рекреируется и теряет vt-name): возможные митигации — Solid `<Show keyed={false}>` границы или `runWithOwner` в CapsuleOutlet. **Зона owner-web-router**, не главного.

### 3.3 jsdom shift у web-router

C1 ввёл `vite-plugin-solid + jsdom + @testing-library/jest-dom` для CapsuleOutlet DOM-теста. До этого пакет был node-env only ("wrap() pure-логика без DOM"). Это **архитектурное смещение** — раньше тестовый посыл был «pure без DOM», теперь есть один DOM-тест.

Принципиально: если пакет растёт ещё в Solid-компонентах (например, future Link wrapper, или Router-level state-mirror), jsdom уже подключён. **Шаг внутрь стандарта web-auth/web-core/web-dnd.** Если же это **исключение** для CapsuleOutlet и пакет должен остаться pure — есть альтернатива: вынести CapsuleOutlet в отдельный пакет (`@capsuletech/web-router-outlet` или в web-core). Я не делал — план-док явно сказал «в web-router», и это самое логичное место (depth-ownership = routing-zone).

**Архитектору решить:** норма ли это «частичное jsdom-shift» web-router, или CapsuleOutlet должен переехать. Я ставлю на «норма» — но это решение, не моё.

## 4. Browser-verification checklist (когда (2.1) закроется)

Прогнать на playground в реальном Chrome (View Transitions = Chromium-only; Firefox/Safari deg.):

1. **Top-level workspace nav** — `/workspace/devops` ↔ `/workspace/docs`. Ожидание: fade нашим timing (200/220ms), header статичен.
2. **Nested workspace → web-studio sub-routes** — `/workspace/web-studio/design` ↔ `/workspace/web-studio/logic` ↔ `/workspace/web-studio/monitor`. **Главный кейс ADR 046 Problem 4.** Ожидание: только под-main фейдится, workspace-header + studio-header статичны.
3. **login → workspace** — `/login` → `/workspace/...`. Ожидание: содержимое login fade-out, workspace fade-in, никакого geometry-slide (group-morph suppressed).
4. **DepthContext propagation в DevTools** — на каждом уровне `<div class="vt-route-content" style="view-transition-name: capsule-content-N">`, N инкрементируется по глубине.

Если (1) и (3) ок, а (2) показывает родительский fade при свопе глубокого роута — пинговать архитектору, эффект 3.2 TanStack remount.

## 5. Что мне НЕ показалось проблемой (для исключения подозрений)

- `router.transition: true` в `apps/playground/capsule.app.ts:14` — стоит, проводка `capsule.app.ts → bootstrap.tsx → createRouter` рабочая.
- C2 wire (page.tsx + widget.tsx, alias `CapsuleOutlet as Outlet`) — точек injection для Ui.Outlet больше нет, всё через эти два места.
- `useRouter()`/`createRouter()`/`beforeLoad` — не задеты.
- Other web-router tests (wrap/normalizeBase/notFoundRedirect/beforeLoad/viewTransition) — продолжают зеленеть на jsdom-env (38 тестов исходных).

---

**Cleanup-инструкция:** после прочтения / включения в ADR-erratu или в OWNERSHIP'ы — удалить `docs/_meta/_tmp/routing-anim-findings.md`. Если что-то в (1.x) решено игнорировать — записать «rejected: <reason>» в plan-doc и удалить пункт отсюда.
