---
title: Spinner
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, spinner, loading]
last_updated: 2026-07-02
slug: web-ui/primitives/spinner
---

# Spinner {#spinner}

Крутящийся индикатор загрузки `@capsuletech/web-ui`. Рендерится как `role="status"` с `aria-label` — screen-reader объявляет состояние загрузки. Наследует текущий цвет (`currentColor`) — перекрашивается через `class`.

> Импорт: `import { Spinner } from '@capsuletech/web-ui/spinner';`

## Когда использовать {#usage}

- **Короткое неопределённое ожидание**: подгрузка данных секции, pending-иконка.
- Внутри кнопки не вставляй вручную — у `Button` есть prop `loading`, он сам рендерит Spinner.
- Для загрузки крупных областей (карточка, таблица, карта) предпочитай `Skeleton` — он держит layout.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Размер круга |
| `label` | `string` | `'Loading'` | a11y-подпись (`aria-label`) для screen-reader |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на элемент; цвет — через `class="text-primary"` и т.п. |

```tsx
<Spinner />
<Spinner size="sm" />
<Spinner size="lg" class="text-primary" label="Загрузка…" />
```

## Доступность {#a11y}

- Корень — `role="status"` + `aria-label`: появление объявляется вежливо (implicit `aria-live="polite"`).
- Сам крутящийся элемент — `aria-hidden="true"` (чисто визуальный).
- Локализуй `label` под язык приложения — дефолтный `'Loading'` английский.

## Контракт для studio {#contract}

<!-- audience: agent -->
`spinner.contract.ts` — leaf; контракт-props: `size` / `label`. `class` — inspector-only, расширяется в `propsSchema` манифеста.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/button|Button]] — `loading` рендерит Spinner автоматически.
- [[web-ui/primitives/skeleton|Skeleton]] — layout-сохраняющий placeholder для крупных областей.
