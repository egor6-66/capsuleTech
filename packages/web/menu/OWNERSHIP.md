# OWNERSHIP — `@capsuletech/web-menu`

> Owner-agent: **owner-web-menu**. AI-anchor: [ADR 044](../../../docs/01-architecture/adr/044-web-menu-package.md).
> Status: **SKELETON (0.0.0)** — контракт есть, рендерер TODO.

## Зачем пакет

Data-driven меню: `items` (данные) + экшены → один канон-стиль всех пунктов,
контейнер-агностично. Вынесено из кита как домен (ADR 044, паттерн table/map).
Глобал `Menus.*` (ADR 033). **НЕ `Ui.*`.**

## Канон-граница

- **web-ui = единственный владелец Kobalte** (как lucide). web-menu **zero-Kobalte** —
  только web-ui-примитивы.
- web-ui: контейнеры (`Dropdown`/`Popover`) + a11y-кирпичи (`Item`/`SubTrigger`/
  `SubContent`) + канон-CVA (`dropdownRowCva`).
- web-menu: data-driven слой (модель + рендер + слот + варианты + controlled-state).
  a11y — вариант (A): композит китовых кирпичей, Kobalte-a11y бесплатно.
- Зависимость: `web-menu → web-ui`.

## Структура (multi-entry)

| Subpath | Файл | Что |
|---|---|---|
| `.` | `src/index.ts` | barrel (ре-экспорт core) |
| `/core` | `src/core/index.ts` | модель данных (`MenuItem` union, `IMenuProps`) + **TODO** renderer |
| `/dropdown` | `src/dropdown/index.ts` | **TODO** `Menu` (Kobalte-проводка через web-ui) |
| `/controllers` | `src/controllers/index.ts` | **TODO** `Controllers.Menu` (useEmit, ADR 032) |
| `/capsule` | `src/capsule.ts` | регистрация `Menus.*` (ADR 033), пока `components: {}` |

## Контракт `/core` — `src/core/interfaces.ts` (стабильная поверхность)

`MenuItem` (дискриминированный union по `type`):
`action` (пункт=кнопка, `onSelect`/`closeOnSelect`/`meta`) · `toggle` (controlled
`checked`/`onChange`) · `submenu` (рекурсия `items[]`) · `expandable` (render-слот
`render()`, controlled `open`) · `separator` · `label`. Stateless; `meta`/теги → HCA-событие.

## План реализации

1. **`/core` renderer** — `renderItems(items)`: каждый `MenuItem` → канон-строка.
   Композит логики `Dropdown.Row` / китовых a11y-кирпичей. Stateless.
2. **`/dropdown`** — `Menu` (Item/SubTrigger через web-ui, submenu-on-hover, клавиатура).
   Кладётся в `Dropdown.Content` / `Popover` потребителем.
3. **`/controllers`** + **`/capsule`** — useEmit + `components: { Dropdown }`.
4. **`expandable`** (render-слот) — под Фон/Глэс панели.
5. **Cross-package (через главного):**
   - перевод меню «Оформление» / список тем / «Выйти» на `Menus` (web-shell + app);
   - удаление data-композита `Dropdown.Row` из web-ui (сырые a11y-кирпичи + CVA остаются) — owner-web-ui.

## Публичный API (текущий)

- `/core` (типы): `MenuItem`, `IMenuProps`, `IMenu{Action,Toggle,Submenu,Expandable,
  Separator,Label}Item`, `IMenuMeta`, `MenuIcon`. **Рендерер ещё не экспортируется.**

## Тесты

Пока нет. При реализации — тест на каждый item-type handler; интерактив
(focus/keyboard/submenu) верифицировать в реальном браузере (jsdom не меряет геометрию
поппера).

## Релиз

Группа `web_base` (fixed, tag `web@{version}`), координирует главный.
