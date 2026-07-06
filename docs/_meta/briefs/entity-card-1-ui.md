# Brief — `Ui.Card` как сущность (слоты + пресеты + a11y) (scope `ui`)

**Канон:** [`docs/01-architecture/component-model.md`](../../01-architecture/component-model.md) —
карточка = **сущность**, рисует данные по ключам; вид = пресет, полнота = слоты вкл/выкл,
точечно = оверрайд пропсами. Потребитель НЕ строит лайаут. Сейчас learn hand-composит
карточки (`Card+Flex+Typography+Badge` руками) — антипаттерн. Задача: сделать `Ui.Card`
data-driven сущностью, чтобы потребитель кормил только данные.

## Контекст (5 потребителей → слоты)
Снято с learn (WordTile/Info = одна сущность «слово» компакт/фулл; LessonCard = урок):
- WordTile: title + 🔊 + фонетика + перевод (center, selectable)
- Info: то же + определение + теги + фасеты (left, full) — **тот же пресет, больше слотов**
- LessonCard: title + бейдж(level) + теги (selectable)

## Часть A — data-driven режим `Ui.Card`
Добавить сущностный режим РЯДОМ с существующим compound (`Card.Header/…` через children
не ломать). Активируется, когда заданы slot-пропы; тогда Card рисует сущность сам, вся
структура/классы — в ките. Слоты (все опциональны → отсутствие = слот погашен):
```ts
interface ICardEntityProps {
  title?: JSX.Element;
  titleAction?: JSX.Element;   // трейлинг рядом с title (напр. 🔊-кнопка) — узел-слот, не лайаут
  subtitle?: JSX.Element;      // muted caption (фонетика/принцип)
  translation?: JSX.Element;   // вторичная строка (перевод)
  definition?: JSX.Element;    // muted определение (gloss)
  badge?: JSX.Element;         // одиночный meta-бейдж (level) — кит рисует Ui.Badge
  tags?: string[];             // ряд бейджей — кит рендерит каждый Ui.Badge tone="muted"
  meta?: { key: string; value: JSX.Element }[];  // key:value muted-строки (фасеты)
  align?: 'start' | 'center'; // выравнивание контента (WordTile=center, Info=start). default 'start'
  // существующие: interactive, selected, padding, class, onClick + любые HTML-атрибуты
}
```
Внутренняя раскладка (вертикальный стек, все классы в ките): строка `title`+`titleAction` →
`subtitle` → `translation` → `definition` → ряд `tags` (wrap) → `meta`-строки. `<Show>` на
каждый слот. `badge` — рядом с title. Ноль сырых классов наружу.

## Часть B — a11y вшит (убрать бойлерплейт потребителя)
Сейчас потребитель добавляет `role="button" tabIndex={0}` руками. Когда `interactive` (и есть
`onClick`) — Card **сам** ставит `role="button"`, `tabIndex={0}`, Enter/Space → onClick. После
этого потребитель не пишет a11y руками.

## Часть C — регистрация в сторе (manifest, 1 слой — Card уже в `Ui`)
`card.manifest.tsx` — расширить `propsSchema` сущностными слотами (label'ы как string для
инспектора; `tags: string[]`, `meta` массив). Добавить `presets[]`:
- `word-compact` (title+titleAction-плейсхолдер+subtitle+translation, center, selectable),
- `word-full` (то же + definition+tags+meta, start),
- `entity-meta` (title+badge+tags, selectable — «карточка урока»).
Каждый preset — JSON `ISchema` с сэмпл-данными (strings). web-core/namespace НЕ трогаем
(`Ui.Card` уже резолвится, manifest-invariant зелёный).

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `:test` + stories (сущностный Card:
слоты вкл/выкл, align, selectable+a11y, все 3 пресета). Существующий compound-Card
(children-режим) не сломан. Ноль сырых классов в публичном API.
