---
title: Article
status: documented
type: composite
audience: dev
tags: [web-ui, composite, article, concept]
last_updated: 2026-07-06
slug: web-ui/composites/article
---

# Article {#article}

Statless «заголовок + лид + markdown-тело + примеры + связанные-чипы» одним
kit-composite. Схлопывает hand-composed learn `Concept` (`Layout.Flex` +
`Typography h1` + `Markdown` + `For` примеры + `For` чипы) — антипаттерн по
канону component-model (композиция живёт в ките пресетом, потребитель кормит
данные).

```tsx
import { Article } from '@capsuletech/web-ui/article';

<Article
  title="UiProxy"
  lead="UI — тень логики."
  body={<Markdown source={concept.body} />}
  examples={concept.examples}
  related={concept.rules}
  relatedLabel="Смотри правила"
  onRelatedSelect={goToRule}
/>;
```

## Props {#props}

| Prop | Тип | Описание |
|---|---|---|
| `title?` | `JSX.Element` | Заголовок (h1). |
| `lead?` | `JSX.Element` | Лид/интро — принцип, muted под заголовком. |
| `body?` | `JSX.Element` | Рендер-нода тела (markdown). Kit только позиционирует. |
| `examples?` | `IArticleExample[]` | Примеры — каждый как compact-`Ui.Card` (`primary`→title, `secondary`→subtitle). |
| `related?` | `IArticleRelated[]` | Связанные — ряд интерактивных `Ui.Badge`-чипов (wrap). |
| `relatedLabel?` | `JSX.Element` | Заголовок блока связанных (напр. «Смотри правила»). |
| `onRelatedSelect?` | `(id: string) => void` | Клик по чипу — отдаёт его id. Runtime-only. |
| `class?` | `string` | Passthrough на корневой стек. |

## Канон {#canon}

- **Stateless, props-only.** Роутер/emit не известны — клик по чипу уходит через
  `onRelatedSelect`. Connected-обвязку держит доменная фича аппа.
- **Всё в ките.** Вертикальный стек, все структуры/классы — внутри компонента;
  каждый слот `<Show>`-gated (отсутствие = слот погашен). Ноль сырых классов
  наружу. Примеры рисуются сущностным `Ui.Card` (data-driven), чипы —
  `Ui.Badge interactive` (a11y кнопки вшита в сам Badge).
- **`body` — узел-слот.** Markdown-рендер с wikilink'ами живёт в learn-домене,
  поэтому потребитель передаёт **свой** отрендеренный markdown, а кит только
  позиционирует. Вынос `Markdown`/wikilink в кит (`Ui.Prose`) — отдельный
  будущий заход.

## Регистрация {#registration}

`ui.Article` (`article.manifest.tsx`, category `composite`, `isLeaf`) — в
`manifest/registry.ts` `ALL[]`. Пресет `concept` (сэмпл-статья). web-core
namespace (`Ui.Article`) заводится отдельно — инвариант-тест связывает
`manifest.type` ↔ Ui-namespace.
