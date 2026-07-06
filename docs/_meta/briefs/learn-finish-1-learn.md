# Brief — learn: empty-state на Placeholders.Empty + Concept/Rule на Ui.Article (scope `learn`)

**⚠️ ПОСЛЕ** мержа `empty-placeholder-1-placeholders.md` (нужен `Placeholders.Empty`) и
`article-1-ui.md` (нужен `Ui.Article`, субпат `@capsuletech/web-ui/article`).

**Канон:** [`docs/01-architecture/component-model.md`](../../01-architecture/component-model.md).
Добиваем learn-пакет: убираем последнюю ручную композицию (empty-state руками + Concept/Rule
статьёй руками). Дриллы отложены → View/RuleDrills доводим ТОЛЬКО по empty-state.

## 1. Empty-state → `Placeholders.Empty` (везде)
Заменить руками собранное пустое состояние
`<Layout.Flex h="full" align="center" justify="center" p={6}><Typography tone="muted">…</Typography></Layout.Flex>`
на `<Empty title="…" />` (import `{ Empty } from '@capsuletech/web-placeholders'`; для узких панелей —
`compact`). Файлы и тексты:
- `library/Info.tsx` — «Выберите слово».
- `shared/words/Words.tsx` — если есть пустой fallback (нет слов) — на Empty.
- `modules/lessons/View.tsx` — «Выберите урок».
- `modules/lessons/RuleDrills.tsx` — «Практики нет».
- `modules/lessons/Concept.tsx` — «Выберите концепт».
- `modules/lessons/Rule.tsx` — «Выберите правило».
- `modules/lessons/Concepts.tsx` / `Rules.tsx` — «Библиотека пуста» / «Справочник пуст».
Убрать ставшие лишними импорты `Layout`/`Typography`, где они только под fallback.

## 2. Concept → `Ui.Article` (полностью)
`import { Article } from '@capsuletech/web-ui/article'`. Снять ручной
`Flex/Typography/Markdown/For examples/For related` → один `<Article>`:
```tsx
<Show when={concept()} fallback={<Empty title="Выберите концепт" />}>
  {(c) => (
    <Article
      title={c().title}
      lead={c().principle}
      body={<Markdown body={c().body} stripLeadingH1 onWikilink={onWikilink} />}
      examples={c().examples.map((ex) => ({ primary: ex.en, secondary: ex.ru }))}
      related={c().relatedRules.map((id) => ({ id, label: ruleLabel(id) }))}
      relatedLabel="Смотри правила"
      onRelatedSelect={selectRule}
      class={props.class}
    />
  )}
</Show>
```
`Markdown` — из `../../shared/markdown`. Логику (`openConcept`/`ruleLabel`/`selectRule`/`onWikilink`/
emit) не трогать.

## 3. Rule → `Ui.Article` (title + markdown-тело)
Rule = статья без examples/related. Снять ручную вёрстку → `<Article title={r().title}
body={<Markdown body={r().body} onWikilink={…} />} class={props.class} />` + `Empty`-fallback
«Выберите правило». Сверься с текущим `Rule.tsx` (маппинг полей по факту).

## 4. View / RuleDrills — ТОЛЬКО empty-state
Заменить fallback на `Empty` (см. §1). **Тело НЕ трогать** — оба встраивают `Drill` (отложен);
полную декомпозицию (View = документ Article+Drill; RuleDrills = заголовок+список Drill) добьём
вместе с дриллами. Не забегать.

## Зависимость + тесты
- `@capsuletech/web-placeholders` — добавить в `package.json` learn-пакета (workspace-dep), если нет.
  Если zone-compliance режет workspace→domain — **СТОП+эскалация** (не глушить).
- Субпат `@capsuletech/web-ui/article` в tsconfig.base — заведёт architect (как sectionedList).
- Тесты Concept/Rule/View/RuleDrills/Info — ассерты пустого состояния на `Placeholders.Empty`
  (текст title), Concept/Rule — на слоты Article. Клик/emit-кейсы сохранить.

## Verify
`nx run @capsuletech/web-learn:typecheck` + `:test` + `:build`. Грепом: ручного
`<Layout.Flex ...><Typography tone="muted">` пустого состояния в блоках больше нет; Concept/Rule
без ручного `Markdown/For` (только `<Article>`).
