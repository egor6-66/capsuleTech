# Brief — `Ui.Article` composite (article-renderer) + регистрация (scope `ui`)

**Канон:** [`docs/01-architecture/component-model.md`](../../01-architecture/component-model.md).
learn `Concept` сейчас **строит статью руками** (`Layout.Flex` + `Typography h1` + `Markdown` +
`For` examples-карточки + `For` related-чипы) — антипаттерн. Статья = переиспользуемый
паттерн (заголовок + лид + markdown-тело + примеры + связанные-чипы) → **kit-composite**,
потребитель кормит данные.

## Часть A — composite `Ui.Article`
Дом: `packages/web/kit/ui/src/composites/article/`. Субпат `@capsuletech/web-ui/article`
(сообщи точную строку — architect добавит tsconfig-путь).

```ts
interface IArticleExample { primary: JSX.Element; secondary?: JSX.Element }
interface IArticleRelated { id: string; label: JSX.Element }
interface IArticleProps {
  title?: JSX.Element;                       // h1
  lead?: JSX.Element;                        // принцип/интро (muted)
  body?: JSX.Element;                        // markdown-контент — узел-слот (см. ниже)
  examples?: IArticleExample[];              // кит рисует каждый как compact-карточку (переиспользуй сущностный Ui.Card)
  related?: IArticleRelated[];               // кит рисует ряд interactive-чипов (Ui.Badge interactive)
  relatedLabel?: JSX.Element;                // заголовок блока связанных («Смотри правила»)
  onRelatedSelect?: (id: string) => void;    // runtime-хендлер клика по чипу
  class?: string;
}
```
Раскладка (вертикальный стек, вся структура/классы в ките, `<Show>` на каждый слот):
`title` → `lead` → `body` → `examples` (стек карточек: `<Card title={ex.primary} subtitle={ex.secondary}/>`
через сущностный Card) → `related` (заголовок `relatedLabel` + wrap-ряд `Ui.Badge interactive
onClick→onRelatedSelect(id)`). Ноль сырых классов наружу.

**Решение по `body` (флажок):** markdown-рендер с wikilink'ами (`[[ref]]`) сейчас живёт в learn
(`modules/lessons/Markdown.tsx`, конвенция домена). Чтобы не тащить это в кит сейчас — `body`
делаем **узлом-слотом** (`JSX.Element`): потребитель передаёт свой отрендеренный markdown, кит
только позиционирует. Вынос `Markdown`/wikilink в кит (`Ui.Prose`/`Ui.Markdown`) — ОТДЕЛЬНЫЙ
будущий заход, НЕ тут.

## Часть B — регистрация в сторе (2 слоя — как SectionedList)
- `article.manifest.tsx`: `type:'ui.Article'`, category `'composite'`, icon, `propsSchema`
  (title/lead/examples/related как сериализуемые; body/onRelatedSelect — runtime, вне схемы),
  `defaultProps` + `presets[]` (сэмпл-статья: заголовок+лид+пара примеров+чипы). Добавить в
  `manifest/registry.ts` `ALL[]`.
- **web-core namespace** — БУДЕТ отдельным мелким брифом (мой, зеркало `sectioned-list-2-web-core`:
  `Ui.Article` в `imports.tsx` + `interfaces.ts`). Landing вместе с этим (invariant-тест). Тебе
  тут его не делать — я подготовлю параллельно.

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `:test` + stories (Article: все слоты,
examples-карточки, related-чипы, пустые слоты скрыты). `getAllManifests()` содержит `ui.Article`.
Ноль сырых классов в публичном API.
