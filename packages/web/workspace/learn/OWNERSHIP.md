---
name: "@capsuletech/web-learn"
owner-agent: owner-web-learn
group: web_base
zone: workspace
status: skeleton
priority: P2
last-updated: 2026-07-06 (lessons split → per-entity modules + 4 stores)
---

# @capsuletech/web-learn

Доменный пакет обучающего flow capsule — уроки, упражнения, прогресс, словарь, гайды (зеркало архитектуры `@capsuletech/web-studio`, домен — обучение).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `learn` (новая top-level зона, ADR 055 D5 / ADR 047). Единственный пакет в зоне; зона существует как slot для обучающего домена.
- **Status:** `skeleton` (0.0.0) — структура, конвенции, регистрация, multi-entry build, smoke-тесты «по-взрослому» как в studio, но **тела компонентов — плейсхолдеры** (`data-stub`, никакой реальной логики/бэкенда), **КРОМЕ `library/*` (Search/Words/Info) и `lessons/*` (List/View + дрилл-интерактив)** — реальный UI + реальный backend-fetch. `library` перенесён из `apps/learn` (brief `learn-library-block-migration.md`, 2026-07-04); `lessons` собран по тому же паттерну (brief `learn-lessons-blocks.md`, 2026-07-04): singleton `createStore`, `api.ts`, connected-блоки, `useEmitOptional`. Остальные модули (exercise/progress/guides/sentence-builder) — по-прежнему плейсхолдеры. Старые `lesson/*`-скелеты (iter-1: LessonView/Concept/CodeBlock/TypeError) **снесены** — заменены реальным `lessons/*`.
- **Priority:** **P2** — фундамент под обучающий app; наполнение и backend-интеграция — последующие итерации.
- **Maturity bar (→ alpha):**
  - Реальный UI остальных модулей (lesson/exercise/progress/guides/sentence-builder) вместо плейсхолдеров — `library` уже реальный.
  - `Controllers.Learn` реализован (валидация exercise, progress-апдейты) через useEmit (ADR 032).
  - Backend-интеграция остальных модулей: `web-query` endpoints к `/learn/*` (ADR 055 D2) — `library` уже ходит на backend напрямую через `fetch` (см. Quirks).
  - app `apps/learn/` связан с пакетом, верификация в браузере (library-блоки — коллапс страницы на блоки, отдельный бриф owner-apps).
- **Active blockers:** owner-agent `owner-web-learn` ещё не создан (появится отдельным PR). Пока зона ведётся через scoped `learn`-сессию.
- **Last activity:** 2026-07-06 (lessons split, brief `learn-lessons-split-1-learn`: `modules/lessons/`-монолит раздроблен по 4 сущностям — `modules/{lessons,concepts,rules,drills}/`, каждый со своим стор-слайсом+api+types+блоками+index. Монолитный `lessonsStore` разорван на `lessonsStore`/`conceptsStore`/`rulesStore`/`drillsStore` (координация СВЕРХУ ВНИЗ: `lessons.open`→`drills.reset`, `lessons.close`→`concepts/rules/drills.reset`, `rules.openRule`→`drills.reset`; siblings друг друга НЕ импортят). `ensureLists`+`refnav` → `core/refnav.ts` (единственный, кто знает несколько сторов). Rename `View`→`Lesson`, `List`→`Lessons`; регистрация ПЛОСКАЯ `Learn.{Lesson,Lessons,Concept,Concepts,Rule,Rules,RuleDrills}` (снят nested `Learn.Lessons.{...}`). Публичный субпат `./lessons` остаётся барелем домена (backward-compat). Emit-source обновлены под плоские имена. Тела `Lesson`/`RuleDrills` НЕ тронуты (доведём с дриллами). Раньше — empty-state → `Placeholders.Empty` + Concept/Rule → `Ui.Article` (brief `learn-finish-1-learn`). 70 тестов зелены, typecheck+build+lint ✓. App-сторона (плоские рефы + один хэндлер) — зона architect/apps-learn, §5 брифа. До этого — 2026-07-06 (shared/ atoms layer, brief `learn-shared-layer-1-learn`: атомы `WordTile`/`Words`/`Search`/`Markdown` вынесены из фиче-модулей в `src/shared/{words,search,markdown}/`; `libraryStore`→`wordsStore` (`ILibraryStore`→`IWordsStore`); промоут `Learn.Library.Words`/`.Search` → `Learn.Words`/`Learn.Search`, internal Markdown → `Learn.Markdown`; `Info`/`Collections` остаются в `library` (композируют `wordsStore`); +3 subpath, 14 vite-entry; направление строгое `modules/→shared/`; 69 тестов зелены, typecheck+build+lint ✓). До этого — 2026-07-05 (nav-dedup pilot, brief `pilot-segment-nav-4-learn`: снесены Nav×2 (`lessons/Nav`, `library/Navigation`) + Welcome×3 (`welcome/Welcome`, `lessons/LessonsWelcome`, `library/LibraryWelcome`) + их event-типы; `Learn.LibraryNav`/`LessonsNav`/`Welcome`/`LessonsWelcome`/`LibraryWelcome` = композиция `Shell.SegmentNav`/`Shell.Launcher` + сегменты зоны в `capsule.tsx`; `+@capsuletech/web-shell` / `−@capsuletech/web-router` в deps; событие консолидировано в `onSegmentNavigate`. 70 тестов зелены, typecheck+build ✓). До этого — refnav lazy-lists: `emitRefNav` async-устойчив — при промахе резолва `await lessonsStore.ensureLists(apiBase)` (идемпотентный догруз обоих списков, гонки одним in-flight) → повторный резолв → emit; чинит wikilink с вкладки, где второй список ещё не смонтирован; brief `learn-refnav-lazy-lists.md`). До этого — Lessons ИА iter 2: аккордеон-группы (category/kind), URL-driven `id`-пропы + кэш-дедуп стора, сплит `Rule`/`RuleDrills`, wikilink/relatedRules-переходы, strip-H1, `LessonsWelcome` (brief `learn-lessons-three-pane.md`).

## Анатомия `src/` (эталон, brief `learn-anatomy-core-modules` + `learn-shared-layer-1-learn`)

Learn = эталон анатомии домен-пакета ([[feedback_mirror_means_literal_mirror]]). В корне `src/` — только `core/ shared/ modules/ __tests__/ capsule.tsx index.ts`:

```
src/
  core/                     ← cross-cutting инфра: provider.tsx / apiContext.ts / interfaces.ts / index.ts
    refnav.ts               ← координатор кросс-нав концепт↔правило (ensureLists + emitRefNav; знает conceptsStore+rulesStore) — internal, НЕ в core/index
    controllers/            ← Controllers.Learn (ADR 032), пока export {}
  shared/                   ← АТОМЫ (переиспользуемые блоки, юзают многие модули)
    words/                  ← store/api/types/WordTile/Words (данные+грид слов) → Learn.Words
    search/                 ← Search (поиск слов, читает wordsStore) → Learn.Search
    markdown/               ← Markdown (renderMarkdown→Prose) → Learn.Markdown
  modules/                  ← фиче-композиты (папка-на-модуль-СУЩНОСТЬ), импортят из shared/ + core/
    lessons/                ← Lesson(деталь)/Lessons(список)/LessonCard + lessonsStore/api/types → Learn.Lesson/Lessons
    concepts/               ← Concept/Concepts + conceptsStore/api/types → Learn.Concept/Concepts
    rules/                  ← Rule/Rules/RuleDrills + rulesStore/api/types → Learn.Rule/Rules/RuleDrills
    drills/                 ← Drill(internal) + drillsStore/api/types (интерактив; ключ ответа на бэке)
    exercise/ guides/ library/ progress/ sentence-builder/ welcome/
  __tests__/                ← package-smoke
  capsule.tsx               ← манифест (ADR 033)
  index.ts                  ← barrel (реэкспорт core)
```

**lessons-домен = 4 сущности (бриф `learn-lessons-split-1-learn`):** `<Entity>`=деталь, `<Entities>`=список. Каждая — свой стор-слайс/api/types/блоки/index. Координация сторов **строго сверху-вниз**: `lessonsStore` (higher-order урок) зовёт `conceptsStore/rulesStore/drillsStore.reset`; `rulesStore.openRule` зовёт `drillsStore.reset`. **Siblings друг друга НЕ импортят** (`conceptsStore` ⊥ `rulesStore`; `drillsStore` ничей). Про НЕСКОЛЬКО сторов знает только `core/refnav.ts` (координатор `ensureLists`) + higher-order `lessonsStore`. Публичный субпат `./lessons` = барель всего домена (агрегирует 4 модуля, backward-compat).

**Направление строгое: `modules/ → shared/`, НИКОГДА `shared/ → modules/`** (атом не знает о композите). Атом ≠ собственность фиче-модуля: `WordTile`/`Words`/`Search`/`Markdown` юзают многие (список слов как контент ИЛИ быстрый поиск в любом модуле; Search learn-wide; Markdown — готовый рендер везде), поэтому они в `shared/`, а не заперты в `library`/`lessons`.

Импорты модуля → core: `../../core/...`; модуль → shared: `../../shared/...` (оба на уровень глубже); тесты модуля → core/shared: `../../../core|shared/...`. Внутри shared: атом → core `../../core/...`, атом → атом `../<atom>/...`. **Vite-entry KEYS = имена субпатов** (`lessons`/`library`/`words`/`search`/`markdown`/…) — `.mjs` остаются flat (`dist/words.mjs`), а `.d.ts` зеркалят src (`dist/shared/words/index.d.ts`, `dist/modules/lessons/index.d.ts`) → `types` в exports репойнтнуты соответственно.

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA: `useEmit`/`useEmitOptional` (shared `Words` + library `Info` → `onWordSelect`/`onSpeak`, lessons detail-блоки → `onConceptSelect`/`onRuleSelect`/`onSpeak`), `defineCapsuleModule` (регистрация).
- **`@capsuletech/web-shell`** (workspace, dep) — `SegmentNav`/`Launcher` из `/ui` (пилот дедупа Nav/Welcome, brief `pilot-segment-nav-4-learn`). Nav/Welcome-биндинги в `capsule.tsx` = композиция этих connected-блоков + сегменты зоны; визуал/routing/emit — внутри web-shell. **`@capsuletech/web-router` больше НЕ прямая зависимость learn** — derived-active nav'а ушёл в web-shell (`useActiveSegment`); learn сам не роутит.
- **`@capsuletech/web-ui`** (workspace, dep) — chrome модулей (Typography / Card / Layout / Button / Group / Input / Toggle / **Accordion** / **SectionedList** — списки Concepts/Rules) + **`Prose`** (типографика rendered-markdown) + **`Article`** (`/article` — kit-композит статьи «title + lead + body + examples + related»; тела `Lessons.{Concept,Rule}`, снята ручная композиция, component-model canon).
- **`@capsuletech/web-placeholders`** (workspace, dep) — `Placeholders.Empty` (`Empty` из barrel) для нейтрального пустого состояния всех детальных/списочных блоков (Info/View/RuleDrills/Concept/Rule/Concepts/Rules) вместо ручного центрированного `Typography tone="muted"`. Узкие панели (RuleDrills/Concepts/Rules) — `compact`.
- **`@capsuletech/web-docs`** (workspace, dep) — `renderMarkdown` для тел концептов/правил урока (таблицы + callout'ы + wikilinks `[[ref]]` → `<a class="wikilink" data-ref>`). Переиспользуем экспортированную top-level функцию (та же механика, что `DocSection` инжектит README в studio Info) — НЕ тянем новый markdown-dep. См. `lessons/Markdown.tsx`.

> `@capsuletech/web-query` добавится при backend-интеграции остальных модулей — сейчас НЕ зависимость. `shared/words/api.ts` и `lessons/api.ts` ходят на backend напрямую нативным `fetch` (не через web-query) — см. Quirks.

## Зона ответственности

### Owns
- `packages/web/workspace/learn/src/` (полностью — анатомия `core/` + `modules/`, см. выше)
- `packages/web/workspace/learn/vite.config.mts`
- `packages/web/workspace/learn/package.json` exports / deps

### Не трогает
- Содержимое других `@capsuletech/*` пакетов (делегировать).
- `tsconfig.base.json` paths + `optimizeDeps.exclude` (architect + owner-builders).
- `apps/learn/` (framework-developer / architect scope).
- `scripts/release-local.mjs`, root `package.json`, `nx.json` (architect).

## Публичный API (subpaths)

| Subpath | Что внутри |
|---|---|
| `.` | barrel: framework-agnostic core (контракты + типы) |
| `./core` | доменные контракты (`IConcept`/`IExercise`/`IProgressEntry`/`ISkillNode`, `ExerciseType`) + `LearnProvider` |
| `./words` | **атом слова** (`shared/words`): `Words`-грид (регистрируется `Learn.Words`) + internal `WordTile` + `wordsStore` singleton (`load`/`select`/`selected`) + `fetchSenses` (`api.ts`) + `ISense`/`ISenseAudio`/`ISenseTag` типы. Промоутнут из `Learn.Library.Words`. Emit `onWordSelect`/`onSpeak` (`source: 'Learn.Words'`) |
| `./search` | **атом поиска** (`shared/search`): `Search` (регистрируется `Learn.Search`) — пишет query в `wordsStore`, триггерит `load` на keystroke. Промоутнут из `Learn.Library.Search`. Импортит `wordsStore` из `shared/words` |
| `./markdown` | **атом рендера** (`shared/markdown`): `Markdown` (регистрируется `Learn.Markdown`) — `renderMarkdown`→`Prose`, strip-H1 + wikilink-делегирование. Был internal `lessons/Markdown`; используется `Lesson`/`Concept`/`Rule` |
| `./lessons` | **Барель lessons-домена** (раздроблен по 4 сущностям, бриф `learn-lessons-split-1-learn`; агрегирует `modules/{lessons,concepts,rules,drills}`, backward-compat manual-typing). Блоки (регистрируются ПЛОСКО, `<Entity>`=деталь/`<Entities>`=список): `Lesson`(←`View`)/`Lessons`(←`List`) уроки → `Learn.Lesson`/`Learn.Lessons`; `Concept`/`Concepts` проза → `Learn.Concept`/`Learn.Concepts`; `Rule`/`Rules`/`RuleDrills` справочник → `Learn.Rule`/`Learn.Rules`/`Learn.RuleDrills`. **Nested `Learn.Lessons.{...}` СНЯТ** → плоские ключи попадают в codegen-`.Events` штатно (ручное типизирование не нужно). **Под-навигация `LessonsNav` / landing `LessonsWelcome`** — композиция `Shell.SegmentNav`/`Shell.Launcher` + `LESSONS_SEGMENTS` в `capsule.tsx` (не блоки зоны, см. Quirks); `LESSONS_SEGMENTS`/`LessonsSegmentId` — в `lessons/segments`. **Списки-аккордеоны** (`Concepts`/`Rules`) на `Ui.SectionedList`: группы (концепты по `kind` Подход/Паттерн/Рекомендация РАЗВёРНУТ; правила по `category` Фонетика/Грамматика/Речь СВёРНУТ кроме активного id), элемент=title. **URL-driven:** деталь-блоки (`Concept`/`Rule`/`RuleDrills`) — `id`-проп, клик = emit `on{Concept,Rule}Select { id }`. **4 стора (split):** `lessonsStore` (уроки `loadList`/`open`/`close`), `conceptsStore` (`loadConcepts`/`openConcept`/`reset`, кэш `concept(id)`), `rulesStore` (`loadRules`/`openRule`/`reset`, кэш `rule(id)`+дриллы, дедуп → `Rule`+`RuleDrills`=ОДИН fetch), `drillsStore` (`setAnswer`/`check`/`answer`/`verdict`/`reset`, глобальный чекер). Координация СВЕРХУ ВНИЗ (см. Quirks). API — per-module `api.ts` (`fetchLessons`/`fetchLesson`; `fetchConcepts`/`fetchConcept`; `fetchRules`/`fetchRule`; `checkDrill`). Типы — per-module. Internal (не в публичном surface): `Drill`/`LessonCard` (item-шаблоны), `core/refnav` (координатор), `WordChip` |
| `./exercise` | `Exercise` (dispatch по type) + `FillBlank`/`BuildClause`/`FixTypeError`/`Translate` |
| `./progress` | `Progress` / `SkillTree` |
| `./library` | library-view-концерны (композиты, юзают атом `shared/words`): `Info` (деталь выбранного слова — читает `wordsStore.selected()` из `shared/words`; регистрируется вложенно `Learn.Library.Info`) + плейсхолдеры `Collections` / `BookmarkButton`. **`Words`/`Search`/`WordTile`/`wordsStore`/`fetchSenses`/`ISense` промоутнуты в `shared/words`+`shared/search`** (атомы, юзают многие) — из `./library` больше НЕ экспортятся. **`LibraryNav` и `LibraryWelcome` больше НЕ блоки зоны** — композиция `Shell.SegmentNav`/`Shell.Launcher` + `LIBRARY_SEGMENTS` в `capsule.tsx` (пилот дедупа, см. Quirks). `LIBRARY_SEGMENTS` internal (не реэкспортится); `LibrarySegmentId`/`ILibrarySegment` реэкспортятся из `./library` (типизация сегментов) |
| `./guides` | `Tour` / `Step` / `Spotlight` / `Hint` |
| `./sentence-builder` | `SentenceBuilder` |
| `./welcome` | **Только данные** — `LEARN_SEGMENTS`/`ILearnSegment`/`LearnSegmentId`. `Welcome`-UI снесён (пилот дедупа): `Learn.Welcome` теперь = `Shell.Launcher` + `LEARN_SEGMENTS` в `capsule.tsx`. Папка схлопнута до `segments.ts`+`index.ts` |
| `./controllers` | гнездо `Controllers.Learn` (ADR 032) — пока пусто (`export {}`) |
| `./capsule` | `capsule.tsx` (JSX — композит-биндинги) — `defineCapsuleModule({ name: 'Learn', components })` (ADR 033). Nav/Welcome-ключи (`LibraryNav`/`LessonsNav`/`Welcome`/`LessonsWelcome`/`LibraryWelcome`) = тонкие data-биндинги `Shell.SegmentNav`/`Shell.Launcher` + сегменты зоны (не блоки зоны, `__events` нет). Плоские атомы `Words`/`Search`/`Markdown` (из `shared/`) + плоские lessons-домен блоки `Lesson`/`Lessons`/`Concept`/`Concepts`/`Rule`/`Rules`/`RuleDrills` + вложенный `Library.{Info}` — блоки зоны |

> **`concepts`/`rules`/`drills` — internal-модули без своего субпата.** lessons-домен раздроблен физически, но публичный surface остаётся один — `./lessons` (барель агрегирует их). Отдельные субпаты (`/concepts` `/rules` `/drills`) — потенциальный follow-up architect'а (tsconfig.base paths + vite-entries), не этого брифа.

Это **контракт**. Изменение публичного API = breaking change → coordinate с architect.

## Quirks / gotchas

- **Nav/Welcome — композиция shell-блоков, НЕ свой UI (пилот дедупа, brief `pilot-segment-nav-4-learn`).** learn = app-host: ноль своего nav/welcome-UI/классов, только данные (сегменты) + композиция. `LibraryNav`/`LessonsNav` = `Shell.SegmentNav`, `Welcome`/`LessonsWelcome`/`LibraryWelcome` = `Shell.Launcher` (оба из `@capsuletech/web-shell/ui`, поверх stateless web-ui `SegmentedBar`/`Launcher`). Биндинги — тонкие JSX-стрелки в `capsule.tsx` (файл `.tsx`, не `.ts`, из-за JSX; vite-entry `capsule: 'src/capsule.tsx'`). **Событие единое `onSegmentNavigate { nav, segment }`** (не per-nav `onNavigate`/`onLibraryNavigate`/`onLessonsNavigate`) — app-Feature различает источник по `payload.nav` (`root`/`lessons`/`library`). Ключи `Learn.*` не менялись, `__events`-фантомов у биндингов нет (контракт события типизируется из `Shell.SegmentNav.Events`, не `Learn.*.Events`).
- **Списки на `Ui.List`, бейджи на `Ui.Badge` (brief `lists-badge-2-learn`, дедуп канон [[feedback_product_wide_kit_layering]]).** `lessons/Lessons` и `shared/words/Words` — batch-режим `Ui.List` (ADR 036): `data`=стор, `item.use`=item-шаблон (`LessonCard` / `WordTile`), `item.props`=маппер. `Lessons` — вертикаль (дефолт), `Words` — `wrap justify="center"`-грид. `LessonCard.tsx` — internal item-шаблон рядом с `Lessons` (не регистрируется). Бейджи → `Ui.Badge`: level/теги урока + теги `Library.Info` = `tone="muted"`; `Drill.WordChip` = статический `Badge` + ОТДЕЛЬНАЯ 🔊-кнопка. `Concept`/`Rule` — теперь `Ui.Article` (title+lead+body+examples+related): relatedRules-чипы и карточки-примеры внутри кита, ручной композиции нет (brief `learn-finish-1-learn`). Пустые состояния — `Placeholders.Empty`.
- **Аккордеон-списки `Concepts`/`Rules` (теперь `concepts/`/`rules/`) — на `Ui.SectionedList`** (kit-композит «аккордеон групп → список»), сырых классов на строках-темах больше нет (промоут tree-item в kit случился ранее). Блок кормит только `sections`/`selectedId`/`open`/`onSelect` — вся структура в ките.
- **Аккордеон-группировка — данные из lang (`category`/`kind`/`sortOrder`, ADR 069), НЕ из тегов.** `IRuleSummary.category` (phonetics/grammar/speech) и `IConceptSummary.kind` (approach/pattern/recommendation) приходят passthrough'ем из `lang` (learn их не переобъявляет). Порядок групп + ru-подписи + подзаголовки — **константа блока** (`RULE_GROUPS`/`CONCEPT_GROUPS`), НЕ бэковый порядок (бэк сортит grammar<phonetics<speech, а показываем phonetics→grammar→speech). Внутри группы — `sortOrder`, затем title. Выводить группы из `tags[]` НЕЛЬЗЯ (теги не иерархия — костыль).
- **Списки URL-driven, стор — кэш-по-id (не «selected»-стейт).** Выбор темы живёт в URL: `Concept`/`Rule`/`RuleDrills` берут `id`-пропом и в `createEffect` зовут `conceptsStore.openConcept`/`rulesStore.openRule`. `open*` ДЕДУПЛИЦИРОВАНЫ (кэш+inflight) → `Rule`+`RuleDrills` на один id дают ОДИН fetch правила (дриллы едут в его композиции). cache-miss `openRule` сбрасывает эфемерный дрилл (`drillsStore.reset`); cache-hit НЕ трогает (иначе второй блок затёр бы ввод первого). Тесты: `rules/store` (дедуп + cache-hit-keep), `concepts/store`, `rules/RuleDrills` (один fetch рядом с `Rule`).
- **Раскрытие аккордеона — controlled `value`/`onChange` сигнал.** Правила: свёрнуто, группу активного id раскрываем ОДИН раз (guard `appliedId`, эффект читает `props.id`+`rules()`, НЕ `open()` — иначе user-collapse ре-открывался бы). Концепты: раскрываем все непустые группы один раз при первой подгрузке (`seeded`). Kobalte `aria-expanded` на триггере — стабильный сигнал для юнит-проверки (content mount/unmount в jsdom не гоняем).
- **Markdown: strip-H1 + wikilink-делегирование.** `stripLeadingH1` режет ведущий `# …` (== title, блок рендерит сам). `onWikilink` вешается через `ref`+native `addEventListener` на контейнер (НЕ JSX-`onClick`) — контейнер не интерактивный контрол (клавиатура идёт через сами `<a>`), так снят a11y-линт `useKeyWithClickEvents`/`noStaticElementInteractions`. `web-docs` рендерит `[[ref]]` как `<a class="wikilink" data-ref>`; резолв ref → `emitRefNav` (`core/refnav.ts` — координатор, читает `conceptsStore`+`rulesStore`): правило→`onRuleSelect`, концепт→`onConceptSelect`, неизвестный→`console.warn` no-op.
- **⚠️ Имя `refnav.ts` (не `nav.ts`) намеренно.** На case-insensitive FS (Windows) `nav.ts` схлопывается с `Nav.tsx` → резолв в барреле ломается. Грабля session 2026-07-05. (Теперь `core/refnav.ts` — координатор кросс-нав, `ensureLists`+`emitRefNav`; internal, НЕ в `core/index`.)
- **⚠️ КООРДИНАЦИЯ 4 сторов — СТРОГО СВЕРХУ ВНИЗ (бриф split, канон).** `lessonsStore` (higher-order урок) импортит и зовёт `conceptsStore`/`rulesStore`/`drillsStore` (`open`→`drills.reset`; `close`→`concepts/rules/drills.reset`). `rulesStore.openRule` зовёт `drillsStore.reset` (rule→drill). **Siblings/lower НЕ импортят выше/вбок:** `conceptsStore` ⊥ `rulesStore`, `drillsStore` ничей. Про НЕСКОЛЬКО сторов знает ТОЛЬКО `lessonsStore` (сверху) + `core/refnav.ts` (координатор `ensureLists`). Добавляешь cross-store вызов — либо он top-down от урока, либо в координатор `core/`. Grep-инвариант: `modules/*/store.ts` — `concepts`↛`rules`, `drills`↛(`lesson`/`rule`/`concept`).
- **`lessons`-домен — тот же канон, что `library`, но ПЛОСКО:** per-entity singleton-сторы (Solid `createStore`, НЕ XState), per-module `api.ts` с явным `apiBase`, `useApiBase()` в блоках, `useEmitOptional`, phantom `__events`. Регистрация **ПЛОСКАЯ** `Learn.{Lesson,Lessons,Concept,Concepts,Rule,Rules,RuleDrills}` (снят nested `Learn.Lessons.{...}`) → плоские ключи **попадают в codegen-`.Events` агрегат штатно, ручное типизирование событий больше НЕ нужно** (в отличие от `Library.Info`, который остаётся вложенным). `LessonsNav`/`LessonsWelcome` — по-прежнему композиция shell-блоков в `capsule.tsx` (не блоки зоны).
- **Markdown-тела концептов/правил обёрнуты в `Prose`** (`@capsuletech/web-ui/prose`), НЕ голый `<div innerHTML>`. `Prose` даёт типографику rendered-markdown (заголовки/списки/таблицы/код) на design-tokens — без неё Tailwind preflight сбрасывает браузерные стили и грамматические таблицы выглядят кашей. Собственных стилей `Markdown` не добавляет (канон «примитивы props-only»).
- **Дриллы правила = дриллы урока (общий чекер `drillsStore`).** `Learn.Lesson` и `Learn.RuleDrills` переиспользуют internal `Drill` (`modules/drills`) как есть; `rulesStore.openRule` cache-miss и `lessonsStore.open` зовут `drillsStore.reset` — переход на другое правило/урок начинает практику с чистого листа. Списки концептов/правил `reset` НЕ чистит — только кэш деталей/интерактив.
- **`drillsStore.reset` чистит map'ы через `reconcile({})`, НЕ `setState('answers', {})`.** Solid `createStore` при передаче объекта на ключ-путь **мёржит** его (пустой объект ничего не чистит → старые ответы залипают между уроками). `reconcile({})` реально заменяет. Грабля закрыта тестами `drills/store` (reset) + `lessons/store` (open cascade). То же в `conceptsStore/rulesStore.reset` (кэши через `reconcile({})`).
- **Дрилл-интерактив: ключ ответа НЕ на фронте.** Item'ы урока санитизированы бэком (`{index,promptRu,context}`) — проверка только через `POST /learn/drills/{id}/check` (канон user «фронт = интерфейс»). `answers`/`verdicts` — эфемерны (не персистим; прогресс = фаза 3).
- **Markdown тел концептов/правил — через `@capsuletech/web-docs` `renderMarkdown`** (`lessons/Markdown.tsx`), `innerHTML` курируемого lang-vault контента. НЕ добавляли markdown-dep. Solid `innerHTML`-проп biome НЕ флагует (в отличие от React `dangerouslySetInnerHTML`) — suppression не нужен.
- **⚠️ architect-TODO (surface):** снесён subpath `./lesson` — в `tsconfig.base.json` остался dangling-alias `@capsuletech/web-learn/lesson` (строка ~48) и НЕТ `@capsuletech/web-learn/lessons`. Правка `tsconfig.base.json` paths — зона architect (см. «Не трогает»). Для app-mount `Learn.Lessons.*` и manual-typing событий из `/lessons` alias нужен. **Owner не правит `tsconfig.base.json` сам** — зафлажено architect'у.
- **⚠️ app-wiring + flat-rename (surface, зона `apps/learn/` — §5 брифа split, architect/apps-learn).** Регистрация расплющена: апп-рефы `Learn.Lessons.{List,View,Concepts,Concept,Rules,Rule,RuleDrills}` → плоские `Learn.{Lessons,Lesson,Concepts,Concept,Rules,Rule,RuleDrills}` в `_workspace/lessons/**` + `features/app.tsx` (источники событий). До этой правки app-mount не найдёт nested-ключи. Плюс блоки URL-driven: `Concept`/`Rule`/`RuleDrills` ждут `id`-проп, `Concepts`/`Rules`/`Concept` эмитят `on{Concept,Rule}Select` → `router.goTo`; `RuleDrills` в `rightBar`. НЕ моя зона — пакет самодостаточен и зелён (70 тестов), интеграция «landing вместе» = architect.
- **⚠️ nav-consolidation (surface, зона `apps/learn/`, follow-up пилота).** После дедупа Nav/Welcome `Features.App` больше не получит `onNavigate`/`onLibraryNavigate`/`onLessonsNavigate` — все nav-биндинги эмитят единый `onSegmentNavigate { nav, segment }`. Нужен один хэндлер (различает по `payload.nav`: `root`→корень workspace, `lessons`/`library`→под-раздел, делает `router.goTo`) вместо трёх. До апп-правки живой nav-роутинг может не работать — это ожидаемо (интеграция последним тактом, отдельный мини-бриф owner apps-learn). НЕ моя зона.
- **`Welcome`-биндинг bare не юнит-тестируется** — `Shell.Launcher` внутри зовёт `useEmitOptional` (non-throwing вне scope) — но собственных unit'ов у тонких композит-биндингов в `capsule.tsx` нет (тестируется сам `Shell.Launcher`/`SegmentNav` в web-shell). `library` блоки (`Words`/`Info`) ЮНИТ-тестируются bare — используют `useEmitOptional` (non-throwing вне scope), мокнутый через `vi.mock('@capsuletech/web-core', ...)` (прецедент `Shell.Picker`).
- **Smoke рендерит через `solid-js/web`** (manual host + dispose), НЕ через `@solidjs/testing-library` — её в репо нет; эталон (studio) тестирует так же.
- **Multi-entry vite build** — все 14 subpaths обязаны присутствовать в `dist/` (+3: `words`/`search`/`markdown` из `shared/`).
- **`controllers` гнездо пустое** — `Controllers.Learn` появится при наполнении.
- **`wordsStore` (`shared/words/store.ts`) — Solid `createStore`-singleton, НЕ XState/Feature.** `@xstate/solid` несёт живой баг подмены строки массива на reconcile (brief `core-xstate-solid-reconcile-corruption.md`, охота отдельная, owner-core) — words-флоу от него не зависит намеренно (mandate user 2026-07-04). Переименован из `libraryStore` при выносе в `shared/` (brief `learn-shared-layer-1-learn`) — держит senses/query/selectedId, это слова, а не library-view.
- **`wordsStore.load(apiBase, q?)` — `apiBase` явный параметр, НЕ читается из контекста.** Стор — модуль-level singleton (Solid `createStore` вне component-scope), `useContext` внутри него невозможен. Компоненты (`Search` из `shared/search`, `Words` из `shared/words`) читают `apiBase` через `useApiBase()` (`core/apiContext.ts`, провайдится `Learn.Provider`) и передают его в `load` явно.
- **`Learn.Library` — вложенный namespace-блок** (сейчас только `Learn.Library.Info`), а не плоские top-level ключи. `CapsuleRegistryPlugin`-codegen per-component `.Events` aggregate (`packages.d.ts`) статически парсит AST только ПЛОСКИХ ключей `components:` — вложенные `Library.*` в агрегат не попадают. `IInfoEvents` типизируется вручную прямым импортом из `@capsuletech/web-learn/library` (не через `Learn.Library.Info.Events`). **`IWordsEvents` теперь ПЛОСКИЙ** (`Learn.Words` промоутнут из-под `Library`) → попадает в codegen-агрегат штатно, ручное типизирование не нужно. Не мой фикс (owner-builders зона codegen) — задокументировано, не блокер.
- **Speaker-клик в `WordTile` (`shared/words`) вызывает `stopPropagation`** — без UiProxy dedup-механики app-слоя (пакетный компонент — голый Solid), клик на вложенной кнопке иначе всплывает и триггерит родительский `onSelect` на Card.

## План рефакторинга / оптимизаций

```markdown
- [x] Skeleton scaffold (структура + регистрация + smoke) — 2026-06-28.
- [x] `library` — реальный UI + store + backend-fetch (Search/Words/Info, перенос из `apps/learn`) — 2026-07-04.
- [x] `lessons` — реальный UI + store + backend-fetch (List/View + дрилл-интерактив/чекер), снос старых `lesson/*`-скелетов (brief `learn-lessons-blocks.md`) — 2026-07-04.
- [x] `lessons` ИА iter 1 — вкладки Концепты/Правила (`Concepts`/`Concept`/`Rules`/`Rule` + `Nav`/`LessonsNav`), правило-с-дриллами («Практика»), Markdown→`Prose` (brief `learn-lessons-ia-blocks.md`) — 2026-07-05.
- [x] `lessons` ИА iter 2 — аккордеон-группы (category/kind, `Ui.Accordion`), URL-driven `id`-пропы + кэш-дедуп стора, сплит `Rule`/`RuleDrills`, wikilink/relatedRules-переходы, strip-H1, `LessonsWelcome` (brief `learn-lessons-three-pane.md`) — 2026-07-05.
- [x] Nav/Welcome dedup — снос Nav×2+Welcome×3, композиция `Shell.SegmentNav`/`Shell.Launcher` + сегменты зоны, единое `onSegmentNavigate` (brief `pilot-segment-nav-4-learn`) — 2026-07-05.
- [x] Списки на `Ui.List` (batch) + бейджи на `Ui.Badge`, снос `VocabList`-скелета (brief `lists-badge-2-learn`) — 2026-07-05.
- [x] Анатомия `core/` + `modules/` — controllers→core/controllers, 7 фича-папок→modules/, репойнт vite-entries + exports `types` (brief `learn-anatomy-core-modules`) — 2026-07-05.
- [x] Слой `shared/` — вынос атомов из фиче-модулей: `words/` (store→`wordsStore`, api, types, WordTile, Words), `search/` (Search), `markdown/` (Markdown); промоут `Learn.Words`/`Learn.Search`/`Learn.Markdown`; `Info` остаётся в `library` (композирует `wordsStore`); +3 subpath (`./words`/`./search`/`./markdown`), 14 vite-entry (brief `learn-shared-layer-1-learn`) — 2026-07-06.
- [x] Empty-state → `Placeholders.Empty` (Info/Lesson/RuleDrills/Concept/Rule/Concepts/Rules) + Concept/Rule → `Ui.Article` (снята последняя ручная композиция статьи; brief `learn-finish-1-learn`) — 2026-07-06. `+@capsuletech/web-placeholders` dep. (Прежний `Ui.Article variant="h3"` typecheck-блокер зоны owner-web-ui — устранён апстримом; `:typecheck` зелён.)
- [x] lessons split — `modules/lessons/`-монолит по 4 сущностям (`lessons`/`concepts`/`rules`/`drills`, каждый свой стор+api+types+блоки), сплит `lessonsStore`→4 стора (координация сверху-вниз), `ensureLists`/`refnav`→`core/refnav`, rename `View`→`Lesson`/`List`→`Lessons`, ПЛОСКАЯ регистрация `Learn.{Lesson,Lessons,Concept,Concepts,Rule,Rules,RuleDrills}`, тесты перенесены под модули (brief `learn-lessons-split-1-learn`) — 2026-07-06. Тела `Lesson`/`RuleDrills` НЕ тронуты (с дриллами). App-сторона (плоские рефы) = architect §5.
- [ ] Тело `Lesson`/`RuleDrills` → декомпозиция с дриллами (Lesson = документ Article+Drill; RuleDrills = заголовок+список Drill) — отложено с дрилл-фазой.
- [ ] Наполнить остальные модули реальным UI (exercise/progress/guides/sentence-builder).
- [ ] Реализовать `Controllers.Learn` (useEmit-эмиссия доменных событий обучения).
- [ ] Backend-интеграция остальных модулей: `web-query` endpoints к `/learn/*` (ADR 055 D2).
- [ ] Создать owner-agent `owner-web-learn` (отдельный PR).
```

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit (smoke) | `src/__tests__/smoke.test.tsx` | рендер pure-display плейсхолдеров (Exercise dispatch/Progress/Tour/SentenceBuilder/Collections) |
| Unit | `lessons/__tests__/store.test.ts` | `loadList`/`open`/`close`, каскад `open`→`drillsStore.reset` |
| Unit | `lessons/__tests__/Lessons.test.tsx` | lazy-load на mount, клик → `open` (fetch урока) + emit `onLessonSelect` |
| Unit | `lessons/__tests__/Lesson.test.tsx` | маршрут concepts→rules→drills (порядок), markdown-тела, дрилл-флоу correct/near_miss(хинт)/wrong/reveal, emit `onSpeak` |
| Unit | `drills/__tests__/store.test.ts` | `setAnswer`/`answer`, `check` (POST item_index+answer), `reset` (regression `reconcile`) |
| Unit | `concepts/__tests__/store.test.ts` | `loadConcepts`, кэш `concept(id)`, **дедуп** `openConcept`, `reset` чистит кэш |
| Unit | `rules/__tests__/store.test.ts` | `loadRules`, кэш `rule(id)`+дриллы, **дедуп** `openRule` (один fetch), cache-miss reset / cache-hit keep дрилла (`drillsStore`) |
| Unit | `concepts/__tests__/Concepts.test.tsx` | lazy-load, **группы по kind** (порядок+ru-подписи+подзаголовки), развёрнут по умолчанию, `sortOrder`-порядок внутри, клик → emit `onConceptSelect` |
| Unit | `concepts/__tests__/Concept.test.tsx` | id-driven `Ui.Article`, title/principle/тело (**strip-H1**)/примеры, `Prose`, **relatedRules-чип → `onRuleSelect`**, **wikilink → `onConceptSelect`**, fallback `Empty` |
| Unit | `rules/__tests__/Rules.test.tsx` | lazy-load, **группы по category** (порядок+подписи), **свёрнут кроме группы активного id** (`aria-expanded`), `sortOrder`-порядок, клик → emit `onRuleSelect` |
| Unit | `rules/__tests__/Rule.test.tsx` | id-driven `Ui.Article` тело в `Prose` (**strip-H1**), БЕЗ дриллов, wikilink → `onRuleSelect`/`onConceptSelect`, **неизвестный ref → `console.warn` no-op**, fallback `Empty` |
| Unit | `rules/__tests__/RuleDrills.test.tsx` | id-driven «Практика» из кэша, дрилл-флоу correct (общий чекер), emit `onSpeak`, **один fetch рядом с `Rule`** (общий кэш), fallback `Empty` |
| Unit | `core/__tests__/refnav.test.ts` | координатор: **ленивый догруз** обоих списков при промахе (`ensureLists` → `conceptsStore`+`rulesStore`); wikilink к правилу/концепту при пустом списке → догруз → emit; unknown ref → warn no-op; повторный резолв не рефетчит; параллельные промахи → один in-flight |
| Unit | `shared/words/__tests__/store.test.ts` | `wordsStore` `load`/`select`/`selected`, select-миграция между id (регрессия к app-слой багу) |
| Unit | `shared/search/__tests__/Search.test.tsx` | keystroke → `load(apiBase, q)`, `apiBase` из `Learn.Provider` / дефолт |
| Unit | `shared/words/__tests__/Words.test.tsx` | lazy-load on mount, `data-selected` миграция по тайлам (регрессия), emit `onWordSelect`/`onSpeak` (`source: 'Learn.Words'`) |
| Unit | `library/__tests__/Info.test.tsx` | fallback без selection, рендер выбранного sense (читает `wordsStore` из `shared/words`), emit `onSpeak` |

**Перед изменением:** unit должны быть green (`pnpm --filter @capsuletech/web-learn test`).

## Cross-package dependencies

| Зона | Owner |
|---|---|
| HCA wrappers, useEmit, defineCapsuleModule | owner-web-core |
| UI primitives (Typography/Card/Layout/Button) | owner-web-ui |
| `renderMarkdown` (markdown тел урока) | owner-web-docs |
| Vite plugins / lib-builder | owner-builders |
| API-слой (web-query endpoints) | owner-web-query |
| `tsconfig.base.json` paths, `optimizeDeps.exclude`, app | architect |

## Release group

- `web_base` — fixed group, tag `web@{version}`.

После изменений координировать release через architect.
