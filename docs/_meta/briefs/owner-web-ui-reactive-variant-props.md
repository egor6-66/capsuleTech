---
title: owner-web-ui — reactive variant/style props (audit + fix pattern)
description: Все примитивы @capsuletech/web-ui должны реактивно реагировать на runtime-смену любых CVA/style-пропсов. Сейчас часть примитивов spread'ит splitProps-результат в createStyle/CVA — реактивность теряется. Нужен общий аудит и фикс-паттерн, годный под будущий user-defined-props сценарий.
status: draft
last_updated: 2026-06-16
tags: [brief, owner-web-ui, reactivity, createStyle, cva]
---

# Brief — owner-web-ui — реактивность variant/style-пропсов в примитивах

> **READ FIRST:** `docs/_meta/owner-agent-canon.md`, `docs/_meta/web-ui.md`.

## Контекст {#context}

В web-studio Inspector умеет менять любые props у выбранной ноды runtime. Schema'а лежит в Solid Store (granular reactivity), Renderer проксирует props через `mergeProps(() => node.props, ...)` — то есть «вход» в компонент уже реактивный.

Но **внутри** примитивов часть пропсов теряет реактивность. Воспроизводится на Button:

```ts
// packages/web/kit/ui/src/primitives/button/button.tsx
const [local, variantProps, ...] = splitProps(props, ['class','style'], ['variant','size'], ...);

const { className, style } = createStyle(buttonCva, {
  ...variantProps,           // ← spread замораживает variant/size
  class: cn(local.class, ...),
  style: local.style,
});
```

`...variantProps` иттерирует splitProps-proxy и **снимает значения один раз** при создании компонента. createStyle получает статичный snapshot. После mount'а смена `variant` в Inspector'е → CVA-класс не пересчитывается, кнопка не реагирует. `data-variant` обновляется (он читается реактивно в JSX), но визуально она «default» навсегда.

То же подозрение по всем примитивам где есть паттерн `createStyle(cva, {...variantProps, ...})` или `cva({...variantProps})` без реактивных геттеров.

## Цель {#goal}

**Все** пропсы примитивов в `@capsuletech/web-ui` обязаны быть реактивными — CVA-варианты, style, class, любые. Не «починить Button», а **систематический паттерн + аудит всех примитивов**.

Это нужно прямо сейчас (web-studio Inspector живёт), и критично в перспективе: скоро будет фича, где **user сам объявит свой prop и привяжет к нему стили**. Значит контракт «реактивно перерисоваться на любое изменение props» — фундамент, не частный кейс Button.

## Корень и фикс-паттерн {#fix-pattern}

**Корень:** spread Solid-props-proxy выполняет жадный read → freezing. Spread-из-proxy — anti-pattern Solid'а, в любой пайплайн ведущий к реактивному пересчёту он не годится. То же справедливо для `{...others}` если оно используется для cva-расчёта, не только для DOM-передачи.

**Канон (решено 2026-06-17):** в путь, ведущий к CVA / createStyle / любому style-расчёту, пропсы попадают **через `mergeProps`** (стандарт Solid). Никаких spread'ов, никаких eager-`cn()`/чтений `local.*` в literal'е, отдаваемом в `createStyle`.

```ts
// КАНОН — mergeProps + getter'ы
const styleProps = mergeProps(variantProps, {
  get class() { return cn(local.class, presentational.fullWidth && 'w-full'); },
  get style() { return local.style; },
});
const { className, style } = createStyle(buttonCva, styleProps);
```

- `mergeProps(variantProps, {...})` — реактивный proxy; `variantProps` остаётся splitProps-источником, `class`/`style` идут через getters.
- `createStyle` контракт **не меняем** (createMemo внутри уже корректный, ему просто не давали реактивный props).
- Cross-zone с owner-web-style **не нужен** на этой итерации.

### Forward-compat: user-defined-props (НЕ сейчас, маркер) {#forward-compat}

Скоро (следующая-следующая итерация) приедет фича «user сам объявляет custom prop и привязывает к нему стили». Это требует overload `createStyle` принимающий accessor (`() => props`) или динамический prop→class mapping — фиксированный CVA-enum контракт не покроет произвольный набор пропсов от user'а.

**Сейчас не делаем.** Когда придёт время — owner-web-style добавит overload, owner-web-ui переедет точечно. Текущий mergeProps-паттерн ему не противоречит; миграция кейсов будет тривиальной.

**TODO когда дойдём:**
1. owner-web-style: новый overload `createStyle(cvaFn, accessor: () => props)` (или helper-фабрика рядом).
2. owner-web-ui: где user-prop поток — переход на accessor-форму.
3. Обновить «Reactivity contract» в `docs/_meta/web-ui.md`.

## Что сделать {#action}

### 1. Аудит всех примитивов

Пройти `packages/web/kit/ui/src/primitives/**` и каждый файл, где есть:
- `splitProps(...) → ...variantProps` спред в `createStyle`/`cva(...)`;
- `cva({...props})` без обёртки в геттер;
- любой иной путь, где snapshot props попадает в style-расчёт.

Зафиксировать список (можно в этом же файле, раздел «Inventory») — что-где-кого.

### 2. Договориться с owner-web-style о форме createStyle

Если фикс требует поменять сигнатуру `createStyle` (вариант B), это **cross-zone**. Согласовать с owner-web-style; либо новая overload, либо новая helper-фабрика. Не делать молча — это shared infra.

### 3. Прокатить фикс по всем найденным примитивам

Один паттерн для всех. После фикса runtime-смена любого variant/size/style-пропа должна сразу отражаться визуально. Тесты:
- unit (jsdom): mount primitive в `<TestHarness>` с signal'ом, поменять signal, проверить что className/style обновились;
- интеграция (Inspector flow): web-studio Inspector edit `variant` → Canvas Button мгновенно меняет класс. Можно покрыть в `packages/web/studio/src/controllers/__tests__/`.

### 4. Подумать про user-defined-props (forward-compat)

Скоро будет: «user объявляет custom prop X, привязывает к нему стили в editor». Это значит CVA-enum-only паттерн не сработает (variants не известны на build-time). Нужен путь, где createStyle/factory принимает **динамический** набор vars + mapping prop→class. Не реализовывать сейчас — но фикс-паттерн НЕ должен этому противоречить. Если выбрал вариант A с явными `get variant()/get size()` — оставь TODO/пометку «расширяется на runtime-vars позже».

## Acceptance {#acceptance}

- Inventory все примитивов с reactivity-баг'ом (даже если уже починены — список зафиксирован).
- Каждый из них реагирует runtime на смену variant/size/любого style-пропа (тест).
- Паттерн задокументирован в `docs/_meta/web-ui.md` (раздел «Reactivity contract for primitives» или подходящий).
- Cross-zone обсуждение с owner-web-style если меняли `createStyle` сигнатуру.
- Главный (architect-agent) + user-инициатор сценария (web-studio Inspector) на ревью.

## Что НЕ делать {#out-of-scope}

- Не лезть в web-studio Inspector / Renderer — там contract «передать props реактивно» соблюдён.
- Не имплементить user-defined-props сейчас — только не закрыть на это дверь.
- Не менять CVA-конфиги примитивов сами по себе (variants/sizes остаются как есть).

## Inventory {#inventory}

Аудит проведён 2026-06-17 по всем `.tsx` в `packages/web/kit/ui/src/primitives/**`.

### Зафикшенные файлы (snapshot → mergeProps/getters)

| Файл | Line (до фикса) | Паттерн-нарушитель |
|---|---|---|
| `button/button.tsx` | 34 | `createStyle(buttonCva, {...variantProps, class: cn(local.class, ...), style: local.style})` — spread freezes variant+size; eager `cn()` freezes class |
| `card/card.tsx` | 40 | `createStyle(cardCva, {...variants, class: cn(local.class, elevationClass()), style: local.style})` — spread freezes variant; eager cn() замораживает elevationClass |
| `input/input.tsx` | 14 | `createStyle(inputCva, {...variants, class: local.class, style: local.style})` — spread freezes size |
| `input/textarea/textarea.tsx` | 30 | `createStyle(textareaCva, {...variants, class: local.class, style: local.style})` — spread freezes size |
| `field/field.tsx` | 10 | `createStyle(fieldCva, {...variants, class: local.class, style: local.style})` — spread freezes orientation |
| `spinner/spinner.tsx` | 21 | `createStyle(spinnerCva, {...variants, class: local.class, style: local.style})` — spread freezes size |
| `typography/typography.tsx` | 47 | `createStyle(typographyCva, {...variantProps, class: local.class, style: local.style})` — spread freezes variant+color |
| `separator/separator.tsx` | 22 | `createStyle(separatorCva, {variant: activeVariant(), class: local.class, style: local.style})` — eager activeVariant() call + eager reads |
| `list/list.tsx` | 36, 77, 97, 120 | 4 call-sites: `{variant: variants.variant, orientation: ..., class: ..., style: ...}` — eager reads from splitProps-proxy (без spread, но в static object literal) |

### Файлы без нарушений (уже корректны или не используют createStyle)

| Файл | Причина ОК |
|---|---|
| `label/label.tsx` | Нет CVA-variants (только class/style) — `{class: local.class, style: local.style}` уже статичные значения, нет реактивных вариантов; **тем не менее** переведён на getters для консистентности контракта |
| `toggle/toggle.tsx` | Не использует `createStyle`; CVA вызывается напрямую в JSX: `cn(toggleTrackCva({ size: size() }), ...)` — `size()` — getter, реактивно |
| `accordion/accordion.tsx` | Нет `createStyle`; классы строятся через `cn()` в JSX с реактивными геттерами |
| `dropdown/dropdown.tsx` | Нет `createStyle`; все `cn(cva(), local.class)` — внутри JSX, реактивно |
| `tooltip/tooltip.tsx` | Нет `createStyle`; `cn(tooltipContentCva(), local.class)` в JSX |
| `slider/slider.tsx` | Нет `createStyle`; `cn(sliderRootCva(), local.class)` в JSX |
| `skeleton/skeleton.tsx` | Нет `createStyle`; `cn(skeletonWrapperCva({variant: local.variant}), local.class)` в JSX — `local.variant` из splitProps-proxy, реактивно |
| `card/parts.tsx` | Нет `createStyle`; `cn(...)` calls в JSX с полями splitProps-proxy — реактивно |
| `field/parts.tsx` | Нет `createStyle`; `cn(defaultClass, local.class)` в JSX |
| `layout/flex/flex.tsx` | Нет `createStyle`; `classes()` — реактивный геттер в JSX |
| `layout/grid/grid.tsx` | Нет `createStyle`; `cn(...)` в JSX |
| `table/table.tsx`, `table/parts.tsx` | Нет `createStyle` |
| `input/select/select.tsx` | Нет `createStyle` |
| `group/group.tsx` | Нет `createStyle` |
| `widget-frame/widget-frame.tsx` | Нет `createStyle` |

## Ссылки {#refs}

- Воспроизведение: web-studio palette → Button preset → Inspector → меняем `variant` → Canvas не меняет класс (но `data-variant` атрибут меняется).
- Файл с примером бага: `packages/web/kit/ui/src/primitives/button/button.tsx:34-38`.
- Renderer reactive-передача: `packages/web/runtime/renderer/src/renderer.tsx:300-315` (mergeProps with getters — корректно).
- Solid Store granular reactivity (для контекста почему «вход» реактивный): `packages/web/studio/src/selection.ts:35-50` (patchProps per-key set комментарий).
