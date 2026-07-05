# Brief — WordTile / Info / LessonCard на сущностный `Ui.Card` (scope `learn`)

**⚠️ ПОСЛЕ мержа `entity-card-1-ui.md`** (нужен data-driven Card + слоты).

**Канон:** [`docs/01-architecture/component-model.md`](../../01-architecture/component-model.md).
Эти 3 блока сейчас **строят лайаут руками** (`Card+Flex+Typography+Badge`) — антипаттерн.
Схлопнуть на `<Card>` со слотами: только данные, ноль вёрстки.

## Файлы
- `library/WordTile.tsx` — слово компакт
- `library/Info.tsx` — слово фулл (та же сущность, больше слотов)
- `lessons/LessonCard.tsx` — урок

## Что сделать (маппинг данные → слоты)
**WordTile** (item.use для `Words`-грида — сигнатуру шаблона сохранить):
```tsx
<Card
  interactive selected={props.selected} onSelect={() => props.onSelect(props.sense.id)}
  align="center"
  title={props.sense.text}
  titleAction={<Button variant="ghost" size="xs"
    onClick={(e) => { e.stopPropagation(); props.onSpeak(props.sense.audio?.url ?? null); }}>🔊</Button>}
  subtitle={props.sense.pron_ru}
  translation={props.sense.ru}
/>
```
**Info** (панель выбранного слова — та же сущность, фулл):
```tsx
<Card
  title={s().text}
  titleAction={<Button variant="ghost" size="sm" onClick={() => emit('onSpeak', {...})}>🔊</Button>}
  subtitle={s().pron_ru}
  translation={s().ru}
  definition={s().gloss}
  tags={(s().tags ?? []).map((t) => `${t.name} · ${t.kind}`)}
  meta={FACETS.filter((f) => s()[f]).map((f) => ({ key: f, value: String(s()[f]) }))}
/>
```
**LessonCard** (item.use для списка уроков):
```tsx
<Card
  interactive selected={props.selected} onSelect={() => props.onSelect(props.lesson.id)}
  title={props.lesson.title}
  badge={props.lesson.level}
  tags={props.lesson.tags}
/>
```
- `#`-префикс тегов LessonCard — оставить в данных (`tags={props.lesson.tags.map((t) => '#' + t)}`),
  если так было; контент тега = забота потребителя.
- Убрать `role="button"/tabIndex` руками (теперь вшито в Card), ручные `Layout.Flex`/`Typography`/
  `Badge`, лишние импорты. `Show`-fallback («Выберите слово» и т.п.) — оставить.

## Тесты
`__tests__` затронутых блоков — перевести ассерты на слот-контент Card (текст title/перевод,
клик→эмит `onSpeak`/select). Клик-эмит-кейсы сохранить.

## Verify
`nx run @capsuletech/web-learn:typecheck` + `:test` + `:build`. Грепом: в 3 файлах нет
`Layout.Flex`/ручного `Badge`/`role="button"` — только `<Card>` + данные. Живой вид снимет user.
