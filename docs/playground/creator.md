# 🧰 web-creator — редакторы и общие тулзы

> **Навигация:** 📍 [Обзор](README.md) · 🗺️ [Роадмап](roadmap.md) · 🏛️ [Архитектура](architecture.md) · 📐 [Контракты](contracts.md) · 🧰 [Creator](creator.md) · 📡 [Мониторинг](monitoring-flow.md) · 🏗️ [Платформа](platform.md) · ⌨️ [Web-code](web-code.md) · 🎁 [Free-wins](free-wins.md)

`@capsuletech/web-creator` — **один пакет, много subpath'ов**: семейство редакторов + переиспользуемые тулзы. Не плодим `web-ui-creator` / `web-logic-creator` отдельными пакетами.

---

## 🧠 Ментальная модель

> 💡 Редактор = **(домен + config-JSON + схема инспектора)** поверх общих тулз. Тулзы декомпозированы и переиспользуются; редактор только композирует нужный набор. Паттерн — «flow мини-апп + shell».

- 🎨 **Хром редактора рисуется на нашем web-ui** (палитра, панели, инспектор).
- 🧪 **Юзерский «кит» инжектится только в канвас.** Сломанный юзер-компонент рендерится в канвасе и **не ломает** хром редактора (юзер может передать хоть одну кнопку).

---

## 🖥️ Раскладка редактора (референс — UMG Unreal)

Ориентир — **Designer-режим UMG Unreal** (palette + hierarchy слева, canvas по центру, details справа, timeline/results снизу). Наша архитектура его уже зеркалит — берём раскладку, **подбиваем под наши цели**.

```
┌──────────────────────────────────────────────────────────┐
│ ТОП-БАР:  Save · [ Designer | Graph ] · Play/Preview       │  ← mode-switch + действия
├──────────┬─────────────────────────────────┬──────────────┤
│ Palette  │  CANVAS (тулбар: zoom / device / │  Inspector   │
│ ──────── │  screen-size) — 1:1 прод-рендер  │  (Details —  │
│ Tree     │  + non-layout overlays           │  из контракта)│
│ ──────── │                                  │              │
│ (Anim)   │                                  │              │
├──────────┴─────────────────────────────────┴──────────────┤
│ НИЖНИЙ ДОК:  Monitor/Timeline · Results · Cmd               │  ← события/трейс · валидации · консоль
└──────────────────────────────────────────────────────────┘
```

| UMG Unreal | → | Наш `web-creator` | Подбили под наши цели |
|---|---|---|---|
| Palette (Button/Image/Border…) | `/palette` | из **контрактов** (`collectContracts`) — любые пакеты (web-ui/table/map), не хардкод-список |
| Hierarchy (дерево виджетов) | `/tree` | JSON-дерево инстансов → `tree.json` (портативный, не `.uasset`) |
| Canvas (device-frame, zoom) | `/canvas` | **1:1 прод-рендер** (web-renderer) + non-layout overlays; **flow-layout (Flex/Grid), НЕ absolute Canvas-Panel** |
| Details (Slot/Anchors/Position/Size) | `/inspector` | контролы **из контракта** (props-схема), не фикс-панель; единицы **Flex/gap/align**, не Position X/Y; + skin/style |
| Animations + Timeline | `/monitor` | поток событий/трейс; анимации = motion-токены web-style; flow-граф позже |
| Compiler Results | валидации | inline-ошибки/подсказки из контрактов (constraint/recommendation) + compliance |
| Content Drawer / Cmd | `web-code` / cmd-k | |
| **Designer ↔ Graph** (тогл) | **mode ui ↔ logic** | Designer = ui-редактор, **Graph = logic-редактор (FSM через flow)** — прямая аналогия |

**Ключевые отличия (наши цели):**
- 🧩 **Контракт-driven** палитра/инспектор — не хардкод per-widget, а из контрактов компонентов.
- 📐 **Flow-layout, не absolute.** UMG = Canvas Panel + Position X/Y + Anchors. Мы = web/HCA flow (Flex/Grid), как Figma Auto Layout. Инспектор правит gap/align/justify, не координаты.
- 🔀 **Designer↔Graph = ui↔logic** — рефенс валидирует наш dual-mode (см. [роадмап](roadmap.md)).
- 🧾 **Headless + портативный JSON** на выходе (не бинарный ассет).
- 🎚️ **Shell получает 4 зоны + топ-бар:** left (palette/tree) · center (canvas + тулбар) · right (inspector) · **bottom dock** (monitor/results/console). Matrix app-shell это хостит слотами.

---

## 🧩 Тулзы (subpaths, shared)

| Subpath | Роль |
|---|---|
| `/shell` | панели-layout (Matrix) + переключатель mode / канваса |
| `/palette` | список компонентов из контрактов (`collectContracts`) |
| `/tree` | дерево инстансов + операции (add/move/remove/update) |
| `/inspector` | schema→контролы (+ новые color / slider-unit / swatch) |
| `/canvas` | рендер (web-renderer) + non-layout overlay-аффордансы |
| `/data` | загрузка JSON → diff vs data-контракт → коэрция (интерактивный Shape) |
| `/monitor` | просмотр потока событий (стандарт; flow-мод позже) |
| `/catalog` | demo-стенд / витрина / тест-среда |

> 🧭 **Правило выноса:** тулза начинается subpath'ом; **дорастает до своего пакета**, когда обретает независимость (тяжёлые deps / рантайм вне редакторов).

---

## ✏️ Редакторы (subpaths, худые ассемблеры)

| Mode | Subpath | Config (per-tenant JSON) | Канвас |
|---|---|---|---|
| **catalog** (demo) | `/catalog` | — | inline (все примитивы) |
| **style** | `/style` | `theme.json` (skin-дельта) | iframe + WS |
| **ui** | `/ui` | `tree.json` | inline / слоты рендерера в аппе |
| **text** | `/text` | `copy.json` (locale × tenant) | iframe + WS |
| **logic** | `/logic` | `fsm.json` | flow-граф |
| **app** | `/app` | композит | — |

Все выходы — **per-tenant JSON** = customization-бандл заказчика для платформы сборки.

---

## 🖼️ Канвас: inline vs iframe+WS

- **inline (same-doc)** — компоненты/styleguide из того же бандла, scoped `data-theme`. Для каталога и быстрых кейсов.
- **iframe + WS** — живой задеплоенный апп; редактор пушит конфиг через WS-канал (`theme.apply` и т.д.). **v1 style-editor = именно так.**

> Канвас-абстракция принимает «target» = inline-рендер **или** iframe-апп. Один код-путь, разные транспорты.

---

## 🔬 Тулза `/data` — данные под компонент

Кейс: чтобы Table что-то нарисовала, нужны данные.

1. 📥 Юзер грузит **любой JSON**.
2. 🔍 `data`-контракт диффит его против требуемой формы → отчёт: чего не хватает / какие поля есть, но в текущем формате не рисуются.
3. 🛠️ Рядом — **коэрция к нужной форме** с минимумом ручного (это интерактивный **Shape**, ADR 036).
4. ✅ Рядом — прогон тестов (см. [мониторинг](monitoring-flow.md)).

---

## 🪜 Как наполняем (фундамент)

1. **F0** контракт-эталон на Button (`web-contract`).
2. **F1** компоненты карманят контракты.
3. **F2** `catalog` — первый потребитель (тест-среда перед ui-редактором).
4. **F3** декомпозиция тулз из ui-creator → `web-creator/*`.
5. **F4** редакторы худеют до ассемблеров.

> 🎯 В перспективе — **полный флоу создания апп через редакторы**. Component-editor + контракты = база, на которой стоит всё.
