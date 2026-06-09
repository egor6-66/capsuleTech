# 🏛️ Playground — архитектура (внутренняя)

> **Навигация:** 📍 [Обзор](README.md) · 🗺️ [Роадмап](roadmap.md) · 🏛️ [Архитектура](architecture.md) · 📐 [Контракты](contracts.md) · 🧰 [Creator](creator.md) · 📡 [Мониторинг](monitoring-flow.md) · 🏗️ [Платформа](platform.md) · ⌨️ [Web-code](web-code.md) · 🎁 [Free-wins](free-wins.md)

---

## 🧩 Принцип: всё декомпозировано, playground композирует

> 💡 Палитра, дерево, инспектор, канвас, загрузчик-данных, монитор — **отдельные тулзы**, не вшиты в один редактор и не дублируются. **Playground = композиция тулз.** Каждый редактор берёт нужный набор.

**Правило выноса:** тулза начинается subpath-модулем в `web-creator`; **дорастает до своего пакета**, когда обретает независимость (тяжёлые deps / используется в рантайме вне редакторов).

---

## 🪜 Слои (снизу вверх)

```
L0  КОНТРАКТЫ
    web-contract (leaf, zero-dep) — протокол defineContract/collect; rule-примитивы

L1  ПРИМИТИВЫ (каждый КАРМАНИТ свои контракты)
    web-ui (base+styleable+nestable) · web-table (data-bindable) · web-map
    web-auth (api-driven) · web-flow (движок виза) · web-query (endpoints)

L1.5 СКВОЗНОЙ РАНТАЙМ
    web-style (skin-контракт = редактируемая поверхность, ADR 042)
    web-intl (copy + tenant-ось) · web-state (event-bus) · web-renderer (рендер схемы)
    WS-канал (транспорт редактор↔апп + трейс)

L2  ТУЛЗЫ — subpaths web-creator (shared, переиспользуемые)
    /palette /tree /inspector(+color/slider/swatch) /canvas(+overlays)
    /data (JSON→diff→коэрция = интерактивный Shape) /monitor /shell /catalog

L3  РЕДАКТОРЫ — subpaths web-creator (худые ассемблеры)
    /catalog(demo) · /style · /ui · /text · /logic · /app

L4  PLAYGROUND (apps/playground) — собирает тулзы/редакторы в воркспейс, любые комбинации

L5  ПЛАТФОРМА
    backend/forge (Rust, axum HTTP+WS) — оркестр контейнеров + node-тулчейн (build/test/tsserver)
    preview-server (раздача) · web-code (Monaco) · build/workspace-платформа

СКВОЗНОЕ:  tenant ⟂ intl/style/build  ·  всё-в-JSON-конфигах  ·  WS-канал = управление + трейс
```

---

## 📦 Топология пакетов

| Пакет / зона | Путь | Owner | Статус |
|---|---|---|---|
| **web-contract** (протокол) | `packages/web/contract/**` | главный (стюард) | 🆕 создать |
| **web-creator** (редакторы+тулзы, subpaths) | `packages/web/creator/**` | owner-web-creator | 🆕 создать |
| web-renderer | `packages/web/renderer/**` | owner-web-renderer | ✅ есть |
| web-ui / web-table / web-map / web-auth / web-flow / web-query | `packages/web/*` | соответствующие owner'ы | ✅ есть |
| web-style (skin-контракт, tenant) | `packages/web/style/**` | owner-web-style | ✅ есть |
| web-intl (copy, tenant) | `packages/web/intl/**` | (нужен owner / главный) | ✅ есть |
| web-code (Monaco-редактор) | `packages/web/code/**` | owner-web-code | 🆕 позже |
| **forge** (Rust оркестр) | `backend/forge/**` | главный / owner-forge | 🆕 позже |
| preview-server | `docker/**` | главный (shared-infra) | ✅ есть |
| playground | `apps/playground/**` | owner playground | ✅ есть |

---

## 🔗 Деп-граф (без циклов)

```
web-style ← web-ui ← web-creator ← (style/ui/text/logic редакторы)
   ▲           ▲          │
   └───────────┴── web-style-creator-subpath тоже тянет web-style напрямую (DAG, не цикл)

web-contract (leaf) ──→ потребляют: web-ui (декларация) + web-creator (потребление)
```

Ключевые правила деп-графа:
- 🍃 **`web-contract` — zero-dep leaf.** Иначе цикл: web-ui деклариует контракты, web-ui ниже web-creator → тип контракта обязан жить в leaf, который импортят оба.
- 🎨 **`web-creator` хром рисует на нашем web-ui** (палитра/панели/инспектор). Юзерский «кит» инжектится **только в канвас** — сломанный юзер-компонент не ломает хром редактора.
- 🚫 **editor-UI НЕ кладём в `web-style/editor`** — иначе `web-style → web-creator → web-ui → web-style` = цикл. Редактор стилей живёт в `web-creator/style`, рантайм-apply остаётся в web-style.

---

## 🧰 web-creator — один пакет, subpaths

> Не плодим `web-ui-creator` / `web-logic-creator` отдельными пакетами. Всё — subpaths одного `web-creator`, тришейкаются, настраиваются в аппе.

| Subpath | Роль |
|---|---|
| `/shell` | панели-layout (Matrix) + переключатель mode/канваса |
| `/palette` `/tree` `/inspector` `/canvas` | общие тулзы (из ui-creator) |
| `/data` | JSON→diff→коэрция (интерактивный Shape) |
| `/monitor` | просмотр потока событий (стандарт; flow-мод позже) |
| `/catalog` | demo-стенд / витрина / тест-среда |
| `/style` `/ui` `/text` `/logic` `/app` | редакторы по доменам |

---

## 🌐 Сквозные оси

### 🏷️ tenant (заказчик)
Единый id связывает **тему + текст + набор фич** заказчика. Механизм уже есть в web-intl (`registerTenantCopy`), web-style приводим к той же модели (base + per-tenant дельта). Все выходы редакторов — **per-tenant JSON** = customization-бандл для forge. **v1 — single-tenant** (один конфиг за прогон); multi-tenant + лицензии — позже.

### 🧾 всё в JSON-конфигах
Выходы редакторов: `theme.json` (skin-дельта) · `copy.json` (locale×tenant) · `tree.json` (UI) · `fsm.json` (логика). Schema-валидируются, портативны, грузятся в рантайме в любом аппе.

### 📡 WS-канал = управление + трейс
Редактор ↔ апп общаются по WS (апп в iframe). По **тому же** каналу апп выкидывает свои структурные события (клик, переход FSM, запрос/ответ) — это и есть **трейс**, без отдельной инструментации. Монитор/flow — разные рендереры одного потока. Событие — единый JSON-конверт. Протокол: именованные события (`theme.apply`, `select.*`, …).
