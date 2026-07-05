---
title: Prose
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, prose, typography, markdown, table]
last_updated: 2026-07-05
slug: web-ui/primitives/prose
---

# Prose {#prose}

Контейнер типографики для **rendered-markdown** (заголовки, списки, **таблицы**, код,
цитаты, ссылки). Стилизует вложенный html/children через descendant-селекторы на
design-tokens — тёмная тема работает автоматически.

Закрывает гэп: `renderMarkdown` (`@capsuletech/web-docs`) отдаёт голый HTML, а
Tailwind preflight сбрасывает браузерные стили. Без Prose проза и грамматические
таблицы (learn концепты/правила, studio Info README) выглядят кашей. Prose — единая
точка типографики для этого HTML.

Импорт: `import { Prose } from '@capsuletech/web-ui/prose';`

## Когда использовать {#usage}

- Рендер markdown-тел (learn концепты/правила — **там таблицы**).
- README в studio Info-панели.
- Любой курируемый HTML, которому нужна документная типографика.

## API {#api}

Потребитель пишет `<Prose innerHTML={html}/>` **или** `<Prose>{jsx}</Prose>` — и ничего
больше.

| Prop | Type | Default | Назначение |
|---|---|---|---|
| innerHTML | string | — | Rendered-markdown HTML (курируемый источник). Инжектится как `innerHTML`. |
| children | JSX.Element | — | Альтернатива `innerHTML` — прямой JSX-контент. |
| size | enum sm/md | md | Плотность. `md` — документ, `sm` — компакт для панелей/Info. |
| as | string \| Component | div | Override корневого тега (напр. `as="article"`). |
| class / style | string / JSX.CSSProperties | — | Прокидываются на корневой элемент. |

`innerHTML` и `children` **взаимоисключимы**: если задан `innerHTML`, `children`
игнорируются (компонент разводит их на разные ветки, чтобы не смешивать
innerHTML-присваивание и insert детей).

## Пример {#example}

```tsx
import { Prose } from '@capsuletech/web-ui/prose';
import { renderMarkdown } from '@capsuletech/web-docs';

const html = renderMarkdown(rule.body); // markdown c таблицей грамматики
<Prose innerHTML={html} />;

// компакт для боковой панели
<Prose size="sm" innerHTML={renderMarkdown(readme)} />;
```

Markdown-таблица после рендера выглядит как документ: линии-сетка на границах ячеек
(`border-collapse` + `border-border`), приглушённый фон заголовка (`bg-muted`) и зебра
на чётных строках (`bg-muted/40`).

## Стили / токены {#tokens}

Всё на существующих design-tokens (Token set FROZEN) — цвет не хардкодится, тёмная
тема наследуется через CSS-переменные.

- Текст: `text-foreground`; вторичный — `text-muted-foreground`.
- Заголовки: `font-extrabold`/`font-semibold` + `tracking-tight`; `h2` c `border-b`.
- Ссылки: `text-primary` + `underline`.
- Код: inline — `bg-muted` + `font-mono`; блок `<pre>` — `border-border` + `bg-muted`.
- Цитата: `border-l-2 border-border` + `italic` + `text-muted-foreground`.
- **Таблицы:** `border-collapse`, ячейки — `border-border`, шапка — `bg-muted`,
  чётные строки — `bg-muted/40`.

### Разделение base ↔ size {#base-vs-size}

Все `text-<size>` и вертикальные `margin`'ы живут **только** в `size`-варианте, а
size-инвариантные правила (цвета, границы, list-маркеры, паддинги ячеек) — в `base`.
Причина: CVA-варианты имеют равную specificity с base; один и тот же
arbitrary-селектор в обоих местах даёт недетерминированный результат. За раз активен
один size-вариант — коллизии исключены.

## Безопасность {#security}

`innerHTML` инжектит HTML без санитайза — источник должен быть **доверенным**
(curated markdown, тот же контракт, что у `DocSection` / learn `Markdown`). Не
передавай пользовательский ввод без предварительной очистки.

## Контракт для studio {#contract}

`prose.contract.ts` описывает props в zod-схеме: `size` enum, `innerHTML` string,
`styleSlots: [root]`, examples (palette preview — с таблицей). Манифест
(`prose.manifest.tsx`, `type: 'ui.Prose'`, категория `typography`) наследует props
через `propsSchemaOf(ProseContract)`.

Если меняешь публичный API:
1. Обновляй `interfaces.ts` + `prose.contract.ts` синхронно.
2. Манифест получает изменения автоматически через `propsSchemaOf`.
3. Добавляй новые примеры в `rule.examples([...])` контракта и пресеты в
   `prose.presets.ts`.

## Связанное {#related}

- Typography — одиночный текстовый блок (h1/h2/p/…) с явным вариантом.
- `@capsuletech/web-docs` `renderMarkdown` — источник HTML для Prose.
