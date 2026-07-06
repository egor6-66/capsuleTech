# Brief — `shared/` слой в learn: вынести атомы из фиче-модулей (scope `learn`)

**Канон (user):** внутри пакета атомарный переиспользуемый блок ≠ собственность фиче-модуля.
Модуль **композирует** атомы, не хардкодит их в себе. `WordTile`/`Words`/`Search`/`Markdown` — НЕ
собственность `library`/`lessons`; их юзают многие (список слов как контент ИЛИ быстрый поиск в
любом модуле; Search learn-wide; Markdown — готовый рендер везде). Сейчас заперты в фиче-модуле —
чтобы взять список слов в другом месте, пришлось бы тащить весь `library`. Неверно.

**Новая анатомия learn:** `core/` (cross-cutting инфра) · **`shared/` (атомы)** · `modules/`
(фиче-композиты, импортят из `shared/`). **Направление строгое: `modules/ → shared/`, НИКОГДА
`shared/ → modules/`.**

## Что переносим

### 1. `src/shared/words/` — данные слова + тайл + список
- **Data-слой (это на деле words-, не «library»-стор):** `modules/library/store.ts` →
  `shared/words/store.ts`, **переименовать `libraryStore` → `wordsStore`** (`ILibraryStore` →
  `IWordsStore`). Он держит senses/query/selectedId/load/select — это слова, не library.
- `modules/library/api.ts` (`fetchSenses`) → `shared/words/api.ts`.
- `modules/library/types.ts` (`ISense`) → `shared/words/types.ts`.
- `modules/library/WordTile.tsx` → `shared/words/WordTile.tsx` (internal building-block, не
  регистрируется отдельно — используется `Words`).
- `modules/library/Words.tsx` → `shared/words/Words.tsx`. Читает `wordsStore`.
- `shared/words/index.ts` — экспорт `Words` (+ типы/стор для потребителей).

### 2. `src/shared/search/` — поиск
- `modules/library/Search.tsx` → `shared/search/Search.tsx`. Импортит `wordsStore` из
  `shared/words/` (word-search). `shared/search/index.ts`.

### 3. `src/shared/markdown/` — markdown-рендер
- `modules/lessons/Markdown.tsx` → `shared/markdown/Markdown.tsx` (+ index). Внутренний building-block
  для View/Concept/Rule — но живёт в shared (готовый рендер, используется повсеместно).

## Что ОСТАЁТСЯ в модулях (композиты, импортят из shared/)
- `modules/library/`: **`Info`** (панель выбранного слова — читает `wordsStore.selected()` из
  `shared/words/`; это library-view-концерн, не атом) + `Collections`. `Info` импорт стора меняет
  на `shared/words/`.
- `modules/lessons/`: `Concepts`/`Rules`/`Concept`/`Drill`/`List`/`View` — `Markdown` теперь из
  `shared/markdown/`.
- Флажок: если считаешь `Info` тоже атомом (word-detail переиспользуем) — **СТОП+эскалация**, не
  двигай молча; user списывал атомами только WordTile/Words/Search/Markdown.

## Регистрация (`capsule.tsx`) — промоут неймспейсов
Промоутнуть из `Learn.Library.*` / внутренних:
- `Learn.Words` (было `Learn.Library.Words`), `Learn.Search` (было `Learn.Library.Search`),
  `Learn.Markdown` (был internal).
- `Learn.Library.Info` — **остаётся** (Info в library). `Learn.Collections` — остаётся.
- Импорты в `capsule.tsx`: `Words`/`Search` из `./shared/...`, `Markdown` из `./shared/markdown`.
- **Emit-source строки:** в `Words` `source: 'Learn.Library.Words'` → `'Learn.Words'` (onWordSelect/
  onSpeak). `Info` `'Learn.Library.Info'` — не трогаем.

## App-сторона (НЕ ты — architect скоординирует, помечаю для полноты)
`apps/learn/src/pages/_workspace/library/explorer.tsx`: `<Learn.Library.Search/>` → `<Learn.Search/>`,
`<Learn.Library.Words/>` → `<Learn.Words/>`. (+ комменты в `features/app.tsx` про источник onSpeak.)
Это делает apps-learn owner / architect — landing вместе с пакетом (иначе битый глобал).

## Тесты / доки
- Перенести `__tests__/store.test.ts` (+ Words/Search/Info тесты) под новые пути; обновить импорты
  (`wordsStore`). Зелёные до и после.
- OWNERSHIP + AI-anchor `docs/_meta/*learn*` — новая анатомия (core/shared/modules), направление
  `modules→shared`.

## Verify
`nx run @capsuletech/web-learn:typecheck` + `:test` + `:build`. Грепом: `shared/**` не импортит
`modules/**`; `Learn.Library.Search`/`Learn.Library.Words` в пакете больше нет (только `Learn.Search`/
`Learn.Words`). App-рефы architect проверит после промоута.
