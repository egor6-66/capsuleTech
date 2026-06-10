---
tags: [hca, adr, proposed, web-menu, web-ui, kobalte, package]
status: proposed
date: 2026-06-10
---

> [!info] Status
> **Proposed (контракт + направление)** — 2026-06-10. Зафиксировано из дизайн-сессии «3 похожих поповера → один data-driven компонент». Реализация после ревью контракта. Связано: [[033-package-registration|033]] (регистрация `Menus.*`), [[032-package-controllers-and-useemit|032]] (`/controllers` + useEmit), [[036-shape-redesign-and-table-package|036]] (прецедент выноса композита в пакет), [[042-canonical-token-system-and-skin-contract|042]] (канон-токены).

# ADR 044 — `@capsuletech/web-menu`: data-driven меню как доменный пакет

## Контекст

1. **Три «выпадайки» выглядят по-разному.** В приложении есть минимум три похожих поповера с пунктами: меню «Оформление» (Dropdown + строки), список тем (Dropdown.Item), редактор «Фон/Подсветки» (Accordion). Под капотом — РАЗНЫЕ компоненты с разной плотностью (`px-2 py-1.5` у строк vs `px-4 py-3` у аккордеона) → нет единой картины, копипаст разметки в каждом потребителе.

2. **Контейнер не должен знать про содержимое.** Dropdown/Popover/Modal — это дженерик-оболочки. Они не должны подстраиваться под accordion/строки/кнопки. Консистентность достигается не подгонкой контейнера, а **единым data-driven компонентом**, который сам владеет стилем всех типов пунктов и кладётся в любой контейнер.

3. **Пункт меню — это и есть интерактивный элемент.** Не «кнопка внутри пункта», а сам пункт = кнопка/строка. Логаут в эталон-аппе сейчас — `Ui.Button` с meta-тегами внутри меню (скруглён, выбивается); правильно — это просто `action`-айтем данных.

4. **Прецедент.** Сложные доменные композиты выносятся из кита в свои пакеты (ADR 036: `web-table` = `Tables.*`; `web-map` = `Maps.*`), регистрируются глобалом (ADR 033), релизятся в группе `web_base`. Меню (с submenu/toggle/командной-палитрой/контекстным-меню) — такой же домен.

5. **Kobalte принадлежит web-ui.** Как `lucide-solid` («web-ui — единственный владелец, остальные импортируют иконки отсюда»), так и `@kobalte/core` живёт в web-ui. Другие пакеты НЕ тянут Kobalte напрямую — они композируют примитивы кита.

## Решение

### 1. Новый пакет `@capsuletech/web-menu`, глобал `Menus.*`

Data-driven меню: даёшь **данные + экшены** → компонент сам рендерит пункты с единым стилем, контейнер-агностично. Регистрируется как `Menus.*` (ADR 033), релиз в группе `web_base` (fixed, tag `web@{version}`), свой owner-web-menu.

Имя глобала — **`Menus.*`** (множественное, как `Tables.*`/`Maps.*`).

### 2. Граница ответственности (web-ui = Kobalte-owner)

| Пакет | Владеет |
|---|---|
| **web-ui** (Kobalte-owner) | Контейнеры-оболочки: `Dropdown` (Root/Trigger/Content), `Popover`, позже `Modal`. Низкоуровневые **a11y-кирпичи** меню: `Item` / `SubTrigger` / `SubContent` (роуминг-фокус, typeahead, submenu-on-hover — всё от Kobalte). Канон-стиль строки (`dropdownRowCva`, экспортируется для шаринга). |
| **web-menu** (zero-Kobalte) | **Data-driven слой**: модель данных (union типов пункта), рендер, render-слот, варианты, controlled-state, клавиатурная оркестрация поверх китовых кирпичей. **Не импортирует Kobalte вообще** — только web-ui. |

Зависимость строго `web-menu → web-ui` (downward, как table/map). Контейнер остаётся дженериком и **не знает про строки**; строки знает web-menu.

**a11y — вариант (A):** web-menu рендерит **примитивы кита** (`Item`/`SubTrigger` из web-ui, под капотом Kobalte) внутрь контейнера → Kobalte-a11y бесплатно, без переписывания клавиатуры/фокуса. Вариант (B) (своя a11y поверх дженерик-Popover) отклонён как оверкилл на старте.

### 3. Структура пакета (core + variant со старта)

```
@capsuletech/web-menu
  /core         — модель данных + union типов пункта + рендер + render-слот + controlled-state.
                  Общее ядро для всех режимов меню.
  /dropdown     — dropdown-вариант: композиция китовых кирпичей (Item/SubTrigger/SubContent),
                  submenu, клавиатура. Возможны расширения логики именно под dropdown-меню.
  /controllers  — Controllers.Menu (useEmit, ADR 032) — именованные события пунктов.
  /capsule      — регистрация Menus.* (ADR 033).
  (позже) /context, /command, /nav — варианты на том же /core.
```

Сплит `/core` ↔ `/dropdown` **со старта**: общее ядро + место под расширение логики конкретно dropdown-меню, не ломая будущие режимы.

### 4. Контракт `/core` — модель данных

Пункт меню — **дискриминированный union** (`type`). Компонент сам выбирает рендерер и стиль:

```ts
type MenuItem =
  | { type: 'action';    id: string; icon?: Icon; label: JSX.Element; disabled?: boolean;
      onSelect?: () => void; meta?: Meta }                         // сам пункт = кнопка
  | { type: 'toggle';    id: string; icon?: Icon; label: JSX.Element; checked: boolean;
      onChange?: (next: boolean) => void; meta?: Meta }            // трейлинг-свитч (controlled)
  | { type: 'submenu';   id: string; icon?: Icon; label: JSX.Element;
      items: MenuItem[] }                                          // боковая панель, РЕКУРСИЯ
  | { type: 'expandable'; id: string; icon?: Icon; label: JSX.Element; open?: boolean;
      onOpenChange?: (open: boolean) => void; render: () => JSX.Element }  // render-слот под тело
  | { type: 'separator'; id: string }
  | { type: 'label';     id: string; label: JSX.Element };

interface IMenuProps {
  items: MenuItem[];
  // контейнер НЕ внутри: <Dropdown.Content><Menus.Dropdown items={...} /></Dropdown.Content>
}
```

Ключевые свойства контракта:

- **Controlled-state.** `checked` / `open` приходят из данных, экшены мутируют наружу. Компонент **stateless** → ложится на HCA (в аппе это `Shape`, мутации через `store`/`emit`).
- **Render-слот** (`expandable.render`) — escape hatch под богатые тела (редактор «Фон», слайдеры «Глэс»): заголовок-строка остаётся каноном, тело произвольное. Так меню остаётся декларативным для 90% и допускает кастом для 10%.
- **Рекурсия** (`submenu.items`) — submenu несёт свой `items[]`, рендерится тем же ядром в боковой панели (web-ui Popover/SubContent).
- **`meta`** — HCA-проводка: пункт несёт meta/теги → UiProxy биндит → именованное событие во `Features` (ADR 032/033). Эталон-апп остаётся без импортов; логаут = `action`-айтем с `meta`.
- **Никаких сырых детей.** В меню не кладут `<Ui.Button>` / сырой `<Accordion>` — всё описывается данными; рендереры внутри web-menu стилизованы под канон строки.

### 5. HCA-интеграция

- `Menus.*` — глобал (ADR 033), `/capsule` регистрирует.
- `/controllers` (`Controllers.Menu`) — useEmit (ADR 032): пункты эмиттят именованные события; `Features` ловят `Feature<Menus.Events>` (типизированный агрегат событий пакета).
- В аппе меню = `Shape`, который маппит данные приложения → `items[]` (как Shape→DataTable для таблиц).

## Миграция (без регрессии)

1. Контракт + ADR (этот документ) → ревью.
2. Скелет `@capsuletech/web-menu` (0.0.0): package.json (multi-entry), tsconfig, alias в `tsconfig.base.json`, project.json, owner-web-menu — **shared-infra, делает главный**.
3. Реализация `/core` + `/dropdown` (action/toggle/submenu/separator/label) → перевод меню «Оформление» + списка тем + «Выйти» на `Menus`.
4. `expandable` (render-слот) → перевод «Фон/Глэс» панелей.
5. **И только потом** — срезать строковый data-композит из web-ui Dropdown (`Dropdown.Row` удаляется; сырые a11y-кирпичи `Item`/`SubTrigger` остаются как Kobalte-владение, канон-CVA шарится).

> **Статус `Dropdown.Row` сейчас:** временный data-композит строки в web-ui (введён в текущей сессии для канон-выравнивания строк меню). С приходом web-menu его логика переезжает в рендерер пункта; web-ui оставляет только сырые a11y-кирпичи + CVA.

## Ортогонально (не часть web-menu)

**Непрозрачность оверлеев.** Оверлеи (Dropdown/Popover/Select Content) должны быть **непрозрачными**, сохраняя glass-стиль. Корень — `createFinish` отдаёт `background` (shorthand), который стирает opaque `bg-popover` панели → контент просвечивает. Фикс: `opaque`-режим в `createFinish` (эмит `background-image` вместо `background` → базовый `bg-popover`/`bg-card` остаётся непрозрачным, градиент/hairline/glow поверх). Это **web-ui/контейнер**, к web-menu отношения не имеет, делается отдельно.

## Последствия

**Плюсы:**
- Единый стиль всех меню, ноль копипаста; контейнер дженерик.
- Вариативность (nav / context-menu / command-palette) на одном `/core`.
- Чистое владение Kobalte (web-ui), правило как с lucide.
- «Выйти» и любые пункты — данные, а не разметка; эталон-апп без импортов.

**Минусы / риски:**
- Новый пакет = scaffold + alias + owner-агент + релиз-координация (web_base).
- owner-web-menu появится только после рестарта сессии ([[new-agent-needs-restart]]).
- Контракт `MenuItem` придётся держать стабильным (breaking-изменения union → миграция потребителей).

## Открытые вопросы

- Точный набор полей `meta` на пункте (теги/aliases) — согласовать с UiProxy-конвенцией.
- Нужен ли `group` как отдельный тип (вложенные `label` + items) или достаточно `label` + плоский список.
- `expandable` через web-ui Accordion-кирпич или собственный disclosure в web-menu (grid-rows). Скорее кирпич из кита.
