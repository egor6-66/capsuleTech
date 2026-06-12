---
tags: [meta, creator, editor, ux, tz, shell, hca]
updated: 2026-06-09
owner: design (design-owner)
status: proposed
---

# ТЗ: UX-шелл редактора (web-studio) — канон HCA + «design-IDE»

> Автор: design-owner. Это UX/архитектурная спецификация. Сборка — **строго по канону HCA** (см. ниже), НЕ монолит.
> Связано: `CLAUDE.md` (HCA golden rules), [[creator]] (тулзы), [[architecture]], [[contracts]], [[monitoring-flow]].

---

## ❗ КАНОН РЕАЛИЗАЦИИ (HCA) — читать ПЕРВЫМ

> 🔴 **Прошлый агент собрал монолит: один файл с роутингом + композицию inline на странице. ТАК НЕЛЬЗЯ.** Студия — это HCA-app-поверхность, строится по слоям.

### Анти-паттерны (что сделано не так — НЕ повторять)
- ❌ **Один файл со всем роутингом.** Роуты = **отдельные Pages** под `apps/playground/src/pages/...` (RouterPlugin генерит роуты из `pages/**`).
- ❌ **Композиция inline на Page.** Golden rule #4: **композиция ТОЛЬКО в Widget.** Page — тонкий (Layout + слот под Widget). Никакой сборки канваса/панелей прямо в Page.
- ❌ Ad-hoc app-state. Состояние (активный subject / workspace / lens / selection) = **Controller/Feature (FSM)**, не россыпь сигналов в компоненте.

### Как строим (по слоям)
| Слой | Что в студии |
|---|---|
| **Page** (роут) | тонкий: Layout + один Widget. Областям/workspace'ам → СВОИ Pages (роуты). |
| **Widget** | вся композиция: шелл-каркас, канвас, инспектор, рейлы — склеиваются ЗДЕСЬ. |
| **View** | stateless куски хрома (панель, рейл, тулбар-кнопка) в JSX. |
| **Shape** | повторяющиеся data-формы (навигация, список тулз, дерево) — schema + as-template. |
| **Controller / Feature** | состояние и поведение шелла (текущий workspace/lens/subject/selection; drill; ⌘K). FSM. |
| **web-creator/*** | **переиспользуемые** тулзы (palette/tree/inspector/canvas/data/monitor) + shell-каркас. Хром на web-ui. |

**Граница:** переиспользуемое (shell-layout, тулзы) → `@capsuletech/web-creator` (owner-web-creator). App-специфичная сборка/роуты/нав → `apps/playground` Pages/Widgets/Shapes/Controllers (app-слойные агенты). Юзерский кит инжектится ТОЛЬКО в канвас (сломанный юзер-компонент не валит шелл).

### Роутинг студии = layout-route + дети (канон + subject-константа)
- **Layout-роут** (`pages/studio` / `pages/studio/layout`) — несёт шелл-каркас + канвас + субъект. **Персистентен** (не перемонтируется при смене workspace).
- **Дочерние роуты по workspace** (`pages/studio/design`, `.../logic`, `.../monitor`) — свопают панели вокруг живого канваса. TanStack layout-route держит родителя → субъект не теряется при свопе. Это «набор роутов» И subject-константа.
- **Lens** внутри Design (ui/style/text/data) — НЕ роут, а **shell-state** (Controller) или search-param → мгновенно, без перемонтажа.
- **Primary destination'ы** (Apps/Builds/DevOps/Source/Routing + Editor) — top-level Pages (роуты).

---

## 🎯 Цель (дизайн)

Единое пространство: настройка дизайн-системы, просмотр компонентов/композиций/аппа, скоро логика. **Эффективно, любой режим в клик, взаимодействие с любым местом, гибко — БЕЗ перегруза** (нельзя всегда показывать все панели).

## 🧭 UX-модель: ТРИ ортогональные оси

В любой момент видно только пересечение → отсюда лёгкость.

| Ось | Что выбирает | Контрол | Канон-механизм |
|---|---|---|---|
| **Subject / Scope** | над ЧЕМ: компонент/композиция/страница/апп | breadcrumb (zoom in/out) | держит layout-роут; Controller-state |
| **Workspace** | каким ИНСТРУМЕНТОМ: Design·Logic·Monitor·(Present) | верхний switcher | **дочерние роуты** |
| **Lens** (в Design) | какой АСПЕКТ: ui·style·text·data | сегмент в Design | **shell-state/search-param** |

**Девиз:** «работаю над **[subject]** в **[scope]** через **[workspace/lens]**». Subject — константа (держит layout-роут), меняется линза.

### Модель режимов — ГИБРИД (решение подтверждено)
- 2-3 тяжёлых workspace (Design·Logic·Monitor) = **дочерние роуты**, перестраивают панели.
- Лёгкие линзы в Design = **state**, меняют только инспектор+оверлеи.
- **Present** = тоггл «скрыть хром» (state), подрежим **theme-matrix** (одна сборка × N тем).
- **Logic = node-граф** (решение подтверждено) — отдельный workspace-роут, большой канвас-граф.

### Layout'ы по workspace (что композирует Widget)
- **Design**: left tree/palette · center КАНВАС · right инспектор · bottom data/preview-drawer. Линзы ui/style/text/data.
- **Logic**: center граф · left states/nodes · right инспектор узла.
- **Monitor**: center живой апп · bottom timeline+state+network · right деталь события.

## 🎨 Глобальный стиль vs локальный (решение: раздельно)
1. **Дизайн-система (глобально):** токены/темы/finish/ambient → реминает ВСЁ. `Shell.Appearance` + token-редактор. Отдельный вход «Design System», НЕ от выделения.
2. **Стиль элемента (локально):** style-линза на выделении.
Гейт раздельный: `styles.tokens` vs `styles.local`.

## 🧭 Навигация и роли (решения подтверждены)

Костяк — **есть**: `Entities.Viewer.role` + `can` на нав-пункте (`Shapes.ShellNavigation`). НЕ ломаем, расширяем.

**Двухуровневая, обе тиры role-gated через `can`:**
1. **Primary** — platform-destination'ы + вход **Editor** (top-level Pages/роуты).
2. **Внутри Editor** — 3 оси; editing-поверхности = workspace-роуты/линзы на ОБЩЕМ субъекте.

**Реклассификация текущих 9 пунктов:**
| Сейчас (`can`) | Тип | Куда |
|---|---|---|
| `apps`·`builds`·`devops`·`source`·`routing` | platform-destination | Primary nav (свои Pages) |
| `ui` | editing | Editor → Design / ui-линза |
| `styles` | editing | → `styles.tokens` (глоб. DS вход) + `styles.local` (style-линза) |
| `words` | editing | Editor → Design / text-линза |
| `logic` | editing | Editor → Logic-workspace (роут, node-граф) |

> ⚠️ Сдвиг: editing-поверхности перестают быть изолированными `/workspace/X` роутами → становятся **дочерними workspace-роутами под общим layout-роутом Editor** (субъект держится). Platform — отдельные destination-Pages.

**Роль = маска над 3-осями:** каждый нав-узел несёт `can`; набор роли раскрывает подмножество → role-tailored shell сам собой. Роль задаёт default landing. Нав-список = **Shape** (расширить `ShellNavigation`), гейтинг — `can` vs `viewer.role`.
- Дизайнер: `ui`/`styles.tokens`/`styles.local`/`words` → Design+DS; logic скрыт.
- Разработчик: `logic`/`source`/`builds`/`ui`.
- DevOps: `apps`/`builds`/`devops`.

## 🔁 Механики непрерывности
- **Selection-driven** (Figma/DevTools): клик в канвасе → инспектор = f(выделение × workspace × lens). Элементы адресуемы (meta-теги + UiProxy + renderer). Selection-state → Controller.
- **Drill в логику:** выделил → инспектор «wired to Controller X» → **peek** (инлайн мини-граф) → «Expand» = переход в Logic-workspace-роут, пред-сфокусированный + breadcrumb. (решение: peek→expand).
- **Смена workspace** — переход дочернего роута, анимированный; layout-роут (субъект) держится.
- **⌘K** — прыжок в любой scope/workspace/элемент (Controller-команда).
- **Floating slide-over** — кросс-режимные мелочи.

## 🚫 Anti-overload правила
1. Канвас сакрален, хром призывается (дефолт — голый канвас + тонкий top-bar + свёрнутые рейлы).
2. ОДИН инспектор, контекстный (не N панелей).
3. Workspace монтирует ТОЛЬКО свои тулзы (ассемблер-модель creator.md).
4. Всё сворачиваемое, layout запоминается per-workspace.
5. Progressive disclosure + ⌘K.
6. Present = ноль хрома.

## 🪜 Фазы (инкрементально, канон)
1. **Скелет (СЕЙЧАС):** layout-роут `pages/studio` (тонкий Page → Widget шелл-каркаса) + ОДИН дочерний роут `design` + ОДИН Widget композиции (top-bar + канвас(renderer) + контекстный инспектор + сворачиваемые рейлы). Состояние (subject/lens/selection) = Controller. Logic/Monitor — заглушки-роуты. Нав = расширенный `ShellNavigation` Shape + `can`. Всё по слоям, НЕ в одном файле.
2. **Линзы в Design** (ui/style/text/data, state) → подключить тулзы web-creator.
3. **Present + theme-matrix.**
4. **Global «Design System» вход** (поверх Shell.Appearance).
5. **Logic workspace** (node-граф, отдельное ТЗ) + drill peek→expand.
6. **Monitor workspace.**

## ✅ Приёмка (фаза 1)
- **Канон:** студия = набор Pages (роуты), НЕ один файл; композиция в Widget(ах), Page тонкий; состояние в Controller; reusable → web-creator, app-wiring → playground.
- Layout-роут держит субъект при свопе дочернего workspace-роута (субъект не перемонтируется).
- Видно ровно ОДИН workspace × subject; смена не показывает чужие панели.
- Канвас центр; выделение наполняет единый инспектор; рейлы сворачиваются.
- ⌘K открывает навигацию (хотя бы заглушка).
- Хром на web-ui; юзер-кит только в канвасе (сломанный компонент не валит шелл).
- Браузер-верификация (UX, jsdom не покажет layout).

## ❓ Решения «подтвердить на ревью»
1. Глобальный DS как отдельный вход — **дефолт да.**
2. Scope-breadcrumb zoom in/out — **дефолт да.**
3. Drill = peek→expand — **дефолт да.**
4. Present = тоггл (не workspace) + theme-matrix — **дефолт да.**
5. «Домашний» экран — **дефолт: каталог компонентов.**
6. Primary nav — sidebar vs top-bar — **дефолт sidebar.**
7. Роль→`can[]` маппинг — где (app-config / backend)? **обсудить.**
8. Lens — state/search-param vs мелкий роут — **дефолт state** (мгновенно, без перемонтажа).

## 🗺️ Делегирование (по слоям)
| Зона | Кто |
|---|---|
| Pages/роуты студии (тонкие), нав-Shape, app-wiring | app-слойные агенты (page/shape) под юзером |
| Widgets композиции (шелл-каркас, канвас, инспектор) | widget-агент + owner-web-creator (reusable части) |
| Controllers/Features (subject/workspace/lens/selection/⌘K/drill) | controller/feature-агенты |
| web-creator shell-layout + тулзы (palette/tree/inspector/canvas) | owner-web-creator |
| Канвас-таргет (renderer inline / iframe+WS) | owner-web-creator + owner-web-renderer |
| Node-граф (logic, фаза 5) | отдельное ТЗ при подходе |
| Ревью канона + ADR при закреплении | design-owner / главный |

---

> ⚠️ Повтор главного: **студия строится по HCA** — Pages(роуты) → Widgets(композиция) → Views/Shapes/Controllers/Features; reusable → web-creator. **НЕ монолит, НЕ inline-композиция на Page, НЕ один файл роутинга.** Новые UI-примитивы хрома — через owner-web-ui, обсудив ([[discuss-new-component]], freeze).
