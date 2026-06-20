---
title: Typography
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, typography, text]
last_updated: 2026-06-20
slug: web-ui/primitives/typography
---

# Typography {#typography}

Текстовый примитив @capsuletech/web-ui. Полиморфный — тег выбирается автоматически из variant
(h1/h2/p/blockquote/code; lead и muted рендерятся как <p>). Поддерживает цветовой override через
tone, выравнивание (align), размер поверх варианта (size) и opacity-скрытие без layout shift (dim).

Импорт: import { Typography } from '@capsuletech/web-ui/typography';

## Когда использовать {#usage}

- Семантические заголовки h1/h2 — иерархия страниц и секций.
- Параграфы — тело текста, описания, инструкции.
- Lead — вступительный абзац раздела (один в начале).
- Muted — подписи под полями, метаданные, hint-текст.
- Blockquote — выделенные цитаты, отзывы, врезки.
- Code — inline-код в потоке текста (имена переменных, пути, короткие snippets).

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| variant | enum h1/h2/p/blockquote/code/lead/muted | p | Семантический вариант. Определяет HTML-тег и стиль. |
| color | enum default/muted/primary/destructive | default | Color через CVA (старый канал). |
| tone | enum default/muted/destructive/primary | — | Color override (новый канал). Приоритетнее color. |
| align | enum start/center/end | — | Выравнивание текста. |
| size | enum xs/sm/base/lg/xl/2xl/3xl/4xl/5xl | — | Размер шрифта поверх варианта. |
| dim | boolean | false | true → opacity-0 + transition-opacity duration-200. |
| as | string or Component | — | Явный override HTML-тега (runtime polymorphism). |
| children | string or JSX.Element | — | Содержимое текстового блока. |
| class / style | string / JSX.CSSProperties | — | Прокидываются на корневой элемент. |

## Семантические варианты {#variants}

- h1 — один на маршрут (SEO + a11y outline). Font extrabold + tight tracking.
- h2 — заголовок секции. Нижний border-b для визуального разделения.
- p — дефолт для тела текста. leading-7 для читаемости.
- lead — крупный вступительный абзац. text-xl + text-muted-foreground.
- muted — приглушённый текст. text-sm + text-muted-foreground.
- blockquote — border-l-2 + italic. Тег blockquote.
- code — font-mono + bg-muted. Тег code.

## color vs tone {#color-vs-tone}

Typography поддерживает два канала управления цветом. tone введён, чтобы не лочить в CVA-color.
Когда оба заданы — tone побеждает. В новом коде предпочитай tone.

| tone | CSS-класс |
|---|---|
| default | text-foreground |
| muted | text-muted-foreground |
| destructive | text-destructive |
| primary | text-primary |

## Размер override {#size}

size перебивает размер шрифта заданный вариантом, сохраняя все остальные стили
(font-weight, tracking, border и т.д.). Пример: variant=h2 size=5xl.

## Align override {#align}

align не пересекается с variant — работает поверх любого варианта.
Значения: start (text-left), center (text-center), end (text-right).

## Dim — fade без layout shift {#dim}

dim={true} → opacity-0; dim={false} (дефолт) → opacity-100. Всегда присутствует
transition-opacity duration-200 для плавной анимации. Элемент остаётся в DOM.
Используй для skeleton-переходов без скачков.

## Полиморфизм (as) {#polymorphism}

as overrides тег, вычисленный из variant. Polymorphism runtime-only — не в контракте (как у Button).
Пример: <Typography variant=p as=span> даёт inline-параграф без смены CVA-стилей.

## Доступность {#a11y}

- Один h1 на маршрут — a11y outline + SEO. Несколько h1 — скринридер дезориентирован.
- Иерархия h1 → h2 → h3 — не пропускай уровни.
- blockquote — добавляй cite для атрибуции источника.
- code — для многострочного кода используй pre+code напрямую, не Typography primitive.
- Color-only информация — дублируй текстом или иконкой (для дальтоников).

## Tokens / стили {#tokens}

Шрифты: text-4xl (h1) / text-3xl (h2) / text-base (p) / text-xl (lead) / text-sm (muted).
Tracking: tracking-tight (h1/h2). Line-height: leading-7 (p).
Цвета через design-system tokens: text-foreground, text-muted-foreground, text-primary, text-destructive.
Border: border-b pb-2 (h2), border-l-2 pl-6 (blockquote).
Переход: transition-opacity duration-200 (всегда — для dim).
Code background: bg-muted rounded.

## Контракт для studio {#contract}

typography.contract.ts описывает props в zod-схеме для studio inspector: enum для
variant/color/tone/align/size, boolean для dim, examples (palette preview), styleSlots: [root].

Если меняешь публичный API:
1. Обновляй interfaces.ts + typography.contract.ts синхронно.
2. typography.manifest.tsx получает изменения автоматически через propsSchemaOf(TypographyContract).
3. Добавляй новые примеры в rule.examples([...]) контракта и пресеты в typography.presets.ts.

## Связанное {#related}

- Label — семантический label for={id} для форм.
- Field — составной Label + Input + Error-message.
