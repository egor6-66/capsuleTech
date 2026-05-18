---
tags: [hca, package, ui]
status: documented
---

# @capsuletech/web-ui

**Расположение:** `packages/web/ui/`
**Зависит от:** `@kobalte/core`, `@capsuletech/web-style`, `solid-js`, `solid-motionone`, `@corvu/resizable`

Stateless UI-kit. Это **строительные блоки** для Entity, не Entity сами по себе. 15 primitives (Button, Input, Card, Field, Grid, Flex, Layout, и др.) — типизированные обёртки над DOM с Tailwind-классами и CVA-вариантами.

## Состав

| Primitive | Назначение | Docs |
|---|---|---|
| **Button** | Кнопка, полиморфная, 4 варианта, 3 размера | [[primitives/button]] |
| **Input** | Текстовое поле (text/email/password/…) | _coming soon_ |
| **Label** | Для связи с формовыми полями (htmlFor) | _coming soon_ |
| **Field** | Compound: Field + Field.Label + Field.Content + Field.Error и др. | _coming soon_ |
| **Card** | Compound: Card + Card.Header + Card.Title + Card.Content + Card.Footer | _coming soon_ |
| **Grid** | CSS Grid с поддержкой областей и динамических размеров | [[primitives/grid]] |
| **Flex** | CSS Flexbox с направлением, выравниванием, gap | _coming soon_ |
| **Layout** | Compound: 5-зонный макет с вариантами (centroid, standard, dashboard, holy-grail) | [[primitives/layout]] |
| **List** | Ul/li обёртка с семантикой | _coming soon_ |
| **Navigation** | Compound: для меню и навигационных элементов | _coming soon_ |
| **Separator** | Hr с ориентацией | _coming soon_ |
| **Toggle** | Checkbox-like, с `checked` и `onChange` | _coming soon_ |
| **Typography** | Полиморфная: h1/h2/p/span/…, 5+ вариантов текста | _coming soon_ |
| **Slot** | Polymorphic-`as` обёртка над @kobalte/core (внутренний) | — |
| **Wrappers** | Animate (с key-ремапингом) + Resizable | _coming soon_ |

## Соглашения

Каждый primitive следует **единому канону**: `index.ts` + `interfaces.ts` + `variants.ts` (обязателен для кнопок/иконок, опционален для layout) + `<name>.tsx` + `<name>.stories.tsx` (обязателен).

Ключевые правила:
- **Стили через CVA + `createStyle`** из [[style|@capsuletech/web-style]]. Только темовые токены (`bg-primary`, `text-foreground`, `border-border`, …), никаких `bg-blue-500`.
- **Polymorphic `as` через `Slot`** — стандарт. `asChild` (Radix-style) больше не используем.
- **Compound-компоненты** через `Object.assign(Base, { Part })` в отдельном `parts.tsx`.
- **Stateless** — никаких `createSignal` для бизнес-логики. Допустимо только UI-only state (controlled vs uncontrolled в Toggle).

Полный канон: [[conventions]].

## Storybook

```bash
cd packages/web/ui
pnpm storybook
```

Запускается на `http://localhost:6006`. Тема-toolbar в `preview.ts` автоматически обнаруживает все темы из `[[style|@capsuletech/web-style]]` и позволяет переключаться прямо в браузере.

Подробнее: [[storybook]].

## Темы и стили

Все primitive'ы реактивны к переключению тем через `data-theme` на `<html>`. Темовая система, list тем, и как добавить новую: [[style|@capsuletech/web-style]] → [[theming]].

## Что **не** должно жить в `@capsuletech/web-ui`

- Бизнес-валидация полей — это уровень Controller/Feature.
- Знание о `meta`/`tags` — UI не знает про мета-теги. Это договор между Entity и [[ui-proxy|UiProxy]].
- Состояние формы — это `store.ctx.data`.
- API-вызовы или XState-логика — UI-kit изолирован от HCA-слоёв.

## Связанное

- [[ui-proxy|UiProxy — перехват UI-событий]]
- [[style|@capsuletech/web-style — стилизация и темы]]
- [[conventions|UI-kit канон и best practices]]
- [[layers|Слои HCA]]
