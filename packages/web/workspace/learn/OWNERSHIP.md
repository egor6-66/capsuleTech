---
name: "@capsuletech/web-learn"
owner-agent: owner-web-learn
group: web_base
zone: workspace
status: skeleton
priority: P2
last-updated: 2026-07-05 (nav-dedup pilot)
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
- **Last activity:** 2026-07-05 (nav-dedup pilot, brief `pilot-segment-nav-4-learn`: снесены Nav×2 (`lessons/Nav`, `library/Navigation`) + Welcome×3 (`welcome/Welcome`, `lessons/LessonsWelcome`, `library/LibraryWelcome`) + их event-типы; `Learn.LibraryNav`/`LessonsNav`/`Welcome`/`LessonsWelcome`/`LibraryWelcome` = композиция `Shell.SegmentNav`/`Shell.Launcher` + сегменты зоны в `capsule.tsx`; `+@capsuletech/web-shell` / `−@capsuletech/web-router` в deps; событие консолидировано в `onSegmentNavigate`. 70 тестов зелены, typecheck+build ✓). До этого — refnav lazy-lists: `emitRefNav` async-устойчив — при промахе резолва `await lessonsStore.ensureLists(apiBase)` (идемпотентный догруз обоих списков, гонки одним in-flight) → повторный резолв → emit; чинит wikilink с вкладки, где второй список ещё не смонтирован; brief `learn-refnav-lazy-lists.md`). До этого — Lessons ИА iter 2: аккордеон-группы (category/kind), URL-driven `id`-пропы + кэш-дедуп стора, сплит `Rule`/`RuleDrills`, wikilink/relatedRules-переходы, strip-H1, `LessonsWelcome` (brief `learn-lessons-three-pane.md`).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA: `useEmit`/`useEmitOptional` (library `Words`/`Info` → `onWordSelect`/`onSpeak`, lessons detail-блоки → `onConceptSelect`/`onRuleSelect`/`onSpeak`), `defineCapsuleModule` (регистрация).
- **`@capsuletech/web-shell`** (workspace, dep) — `SegmentNav`/`Launcher` из `/ui` (пилот дедупа Nav/Welcome, brief `pilot-segment-nav-4-learn`). Nav/Welcome-биндинги в `capsule.tsx` = композиция этих connected-блоков + сегменты зоны; визуал/routing/emit — внутри web-shell. **`@capsuletech/web-router` больше НЕ прямая зависимость learn** — derived-active nav'а ушёл в web-shell (`useActiveSegment`); learn сам не роутит.
- **`@capsuletech/web-ui`** (workspace, dep) — chrome модулей (Typography / Card / Layout / Button / Group / Input / Toggle / **Accordion** — списки-аккордеоны Concepts/Rules) + **`Prose`** (типографика rendered-markdown + callout на design-tokens — обёртка тел концептов/правил в `lessons/Markdown.tsx`).
- **`@capsuletech/web-docs`** (workspace, dep) — `renderMarkdown` для тел концептов/правил урока (таблицы + callout'ы + wikilinks `[[ref]]` → `<a class="wikilink" data-ref>`). Переиспользуем экспортированную top-level функцию (та же механика, что `DocSection` инжектит README в studio Info) — НЕ тянем новый markdown-dep. См. `lessons/Markdown.tsx`.

> `@capsuletech/web-query` добавится при backend-интеграции остальных модулей — сейчас НЕ зависимость. `library/api.ts` и `lessons/api.ts` ходят на backend напрямую нативным `fetch` (не через web-query) — см. Quirks.

## Зона ответственности

### Owns
- `packages/web/learn/src/` (полностью)
- `packages/web/learn/vite.config.mts`
- `packages/web/learn/package.json` exports / deps

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
| `./lessons` | **Реальный** раздел Lessons (ИА iter 2: аккордеон-группы + URL-driven деталь). Блоки: `List` / `View` (уроки), `Concepts` / `Concept` (библиотека прозы), `Rules` / `Rule` / `RuleDrills` (справочник; правило и его практика — раздельные блоки под three-pane). **Под-навигация `LessonsNav` и landing `LessonsWelcome` больше НЕ блоки зоны** — это композиция `Shell.SegmentNav`/`Shell.Launcher` + `LESSONS_SEGMENTS` в `capsule.tsx` (пилот дедупа, см. Quirks). `LESSONS_SEGMENTS`/`LessonsSegmentId` остаются в `./lessons/segments` как данные. **Списки-аккордеоны** (`Concepts`/`Rules`) на `Ui.Accordion` (паттерн studio-палитры): рут=группа (концепты по `kind` Подход/Паттерн/Рекомендация, РАЗВёРНУТ по умолчанию; правила по `category` Фонетика/Грамматика/Речь, СВёРНУТ кроме группы активного id), элемент=карточка-тема (только title). Порядок групп + ru-подписи — константа блока; внутри — по `sortOrder`. **URL-driven:** деталь-блоки (`Concept`/`Rule`/`RuleDrills`) получают `id`-пропом, клик по списку = emit `on{Concept,Rule}Select { id }` (апп роутит). Регистрация: вложенно `Learn.Lessons.{List,View,Concepts,Concept,Rules,Rule,RuleDrills}` (деталь-блоки) + плоские `Learn.LessonsNav`/`Learn.LessonsWelcome` (композиция shell-блоков в `capsule.tsx`, не блоки зоны). `lessonsStore` singleton — уроки (`loadList`/`open`), **кэш-по-id концептов/правил** (`loadConcepts`/`openConcept`, `loadRules`/`openRule` с дедупом → `Rule`+`RuleDrills` на один id = ОДИН fetch; геттеры `concept(id)`/`rule(id)`), общий `close` + эфемерный интерактив дрилла (`setAnswer`/`check`/`answer`/`verdict`, глобальный чекер). API (`api.ts`): `fetchLessons`/`fetchLesson`/`fetchConcepts`/`fetchConcept`/`fetchRules`/`fetchRule`/`checkDrill`. Типы: `ILessonSummary`/`ILessonDetail`/`IConceptSummary`(+`kind`/`sortOrder`)/`IConcept`/`IRuleSummary`(+`category`/`sortOrder`)/`IRule`/`IRuleDetail`/`IDrill`/`IResolvedWord`/… + `ConceptKind`/`RuleCategory`/`LessonsSegmentId`/`LESSONS_SEGMENTS`. Internal (не регистрируются): `Drill` (интерактив), `Markdown` (renderMarkdown → `Prose`, strip-H1 + wikilink-делегирование), `refnav` (кросс-нав хелпер), `WordChip` |
| `./exercise` | `Exercise` (dispatch по type) + `FillBlank`/`BuildClause`/`FixTypeError`/`Translate` |
| `./progress` | `Progress` / `SkillTree` |
| `./library` | **Реальный** library-браузер (перенесён из `apps/learn`, канон «пакет владеет стором» — см. Quirks): `Search` / `Words` / `Info` (регистрируются вложенно `Learn.Library.Search`/`.Words`/`.Info`) + `libraryStore` singleton (`load`/`select`/`selected`) + `fetchSenses` (`api.ts`) + `ISense` тип. Плюс прежние плейсхолдеры: `Collections` / `BookmarkButton` (`VocabList` снесён — brief `lists-badge-2-learn`). **`LibraryNav` и `LibraryWelcome` больше НЕ блоки зоны** — композиция `Shell.SegmentNav`/`Shell.Launcher` + `LIBRARY_SEGMENTS` в `capsule.tsx` (пилот дедупа, см. Quirks). `LIBRARY_SEGMENTS` internal (не реэкспортится); `LibrarySegmentId`/`ILibrarySegment` реэкспортятся из `./library` (типизация сегментов) |
| `./guides` | `Tour` / `Step` / `Spotlight` / `Hint` |
| `./sentence-builder` | `SentenceBuilder` |
| `./welcome` | **Только данные** — `LEARN_SEGMENTS`/`ILearnSegment`/`LearnSegmentId`. `Welcome`-UI снесён (пилот дедупа): `Learn.Welcome` теперь = `Shell.Launcher` + `LEARN_SEGMENTS` в `capsule.tsx`. Папка схлопнута до `segments.ts`+`index.ts` |
| `./controllers` | гнездо `Controllers.Learn` (ADR 032) — пока пусто (`export {}`) |
| `./capsule` | `capsule.tsx` (JSX — композит-биндинги) — `defineCapsuleModule({ name: 'Learn', components })` (ADR 033). Nav/Welcome-ключи (`LibraryNav`/`LessonsNav`/`Welcome`/`LessonsWelcome`/`LibraryWelcome`) = тонкие data-биндинги `Shell.SegmentNav`/`Shell.Launcher` + сегменты зоны (не блоки зоны, `__events` нет). Вложенные `Library.{Search,Words,Info}` и `Lessons.{List,View,Concepts,Concept,Rules,Rule,RuleDrills}` — блоки зоны |

Это **контракт**. Изменение публичного API = breaking change → coordinate с architect.

## Quirks / gotchas

- **Nav/Welcome — композиция shell-блоков, НЕ свой UI (пилот дедупа, brief `pilot-segment-nav-4-learn`).** learn = app-host: ноль своего nav/welcome-UI/классов, только данные (сегменты) + композиция. `LibraryNav`/`LessonsNav` = `Shell.SegmentNav`, `Welcome`/`LessonsWelcome`/`LibraryWelcome` = `Shell.Launcher` (оба из `@capsuletech/web-shell/ui`, поверх stateless web-ui `SegmentedBar`/`Launcher`). Биндинги — тонкие JSX-стрелки в `capsule.tsx` (файл `.tsx`, не `.ts`, из-за JSX; vite-entry `capsule: 'src/capsule.tsx'`). **Событие единое `onSegmentNavigate { nav, segment }`** (не per-nav `onNavigate`/`onLibraryNavigate`/`onLessonsNavigate`) — app-Feature различает источник по `payload.nav` (`root`/`lessons`/`library`). Ключи `Learn.*` не менялись, `__events`-фантомов у биндингов нет (контракт события типизируется из `Shell.SegmentNav.Events`, не `Learn.*.Events`).
- **Списки на `Ui.List`, бейджи на `Ui.Badge` (brief `lists-badge-2-learn`, дедуп канон [[feedback_product_wide_kit_layering]]).** `lessons/List` и `library/Words` — batch-режим `Ui.List` (ADR 036): `data`=стор, `item.use`=item-шаблон (`LessonCard` / `WordTile`), `item.props`=маппер. `List` — вертикаль (дефолт), `Words` — `wrap justify="center"`-грид. `LessonCard.tsx` — новый internal item-шаблон рядом с `List` (не регистрируется). Все ad-hoc бейджи-пилюли (`Card padding="sm" + Typography muted`) → `Ui.Badge`: level/теги урока + теги `Library.Info` = `tone="muted"` (тег-контент несёт `#`-префикс сам); relatedRules-чипы `Concept` = `interactive onClick` (role=button+Enter/Space внутри примитива); `Drill.WordChip` = статический `Badge` + ОТДЕЛЬНАЯ 🔊-кнопка рядом (чип не кликабелен — не сливаем speak в чип). Ноль `Card padding="sm"`-бейджей и ноль сырых классов на бейджах. Оставшийся `Card padding="sm"` в `Concept` — карточки-**примеры** (en/ru), не бейджи (структурный контент, легитимно).
- **⚠️ Остаточные сырые классы (surface, НЕ в scope брифов дедупа).** `lessons/Concepts.tsx` и `lessons/Rules.tsx` (аккордеон-дерево, ИА iter 2) до сих пор несут сырой Tailwind на строках-темах (`flex w-full cursor-pointer …`). Это отдельная работа (промоут tree-item в web-ui примитив, зона owner-web-ui), не этих брифов. Зафлажено architect'у.
- **Аккордеон-группировка — данные из lang (`category`/`kind`/`sortOrder`, ADR 069), НЕ из тегов.** `IRuleSummary.category` (phonetics/grammar/speech) и `IConceptSummary.kind` (approach/pattern/recommendation) приходят passthrough'ем из `lang` (learn их не переобъявляет). Порядок групп + ru-подписи + подзаголовки — **константа блока** (`RULE_GROUPS`/`CONCEPT_GROUPS`), НЕ бэковый порядок (бэк сортит grammar<phonetics<speech, а показываем phonetics→grammar→speech). Внутри группы — `sortOrder`, затем title. Выводить группы из `tags[]` НЕЛЬЗЯ (теги не иерархия — костыль).
- **Списки URL-driven, стор — кэш-по-id (не «selected»-стейт).** Выбор темы живёт в URL: `Concept`/`Rule`/`RuleDrills` берут `id`-пропом и в `createEffect` зовут `openConcept`/`openRule`. `open*` ДЕДУПЛИЦИРОВАНЫ (кэш+inflight) → `Rule`+`RuleDrills` на один id дают ОДИН fetch правила (дриллы едут в его композиции). cache-miss `openRule` сбрасывает эфемерный дрилл (свежая практика на новом правиле); cache-hit НЕ трогает (иначе второй блок затёр бы ввод первого). Тест: `store.concepts-rules` (дедуп + cache-hit-keep), `RuleDrills` (один fetch рядом с `Rule`).
- **Раскрытие аккордеона — controlled `value`/`onChange` сигнал.** Правила: свёрнуто, группу активного id раскрываем ОДИН раз (guard `appliedId`, эффект читает `props.id`+`rules()`, НЕ `open()` — иначе user-collapse ре-открывался бы). Концепты: раскрываем все непустые группы один раз при первой подгрузке (`seeded`). Kobalte `aria-expanded` на триггере — стабильный сигнал для юнит-проверки (content mount/unmount в jsdom не гоняем).
- **Markdown: strip-H1 + wikilink-делегирование.** `stripLeadingH1` режет ведущий `# …` (== title, блок рендерит сам). `onWikilink` вешается через `ref`+native `addEventListener` на контейнер (НЕ JSX-`onClick`) — контейнер не интерактивный контрол (клавиатура идёт через сами `<a>`), так снят a11y-линт `useKeyWithClickEvents`/`noStaticElementInteractions`. `web-docs` рендерит `[[ref]]` как `<a class="wikilink" data-ref>`; резолв ref → `emitRefNav` (`refnav.ts`): правило→`onRuleSelect`, концепт→`onConceptSelect`, неизвестный→`console.warn` no-op.
- **⚠️ Имя `refnav.ts` (не `nav.ts`) намеренно.** На case-insensitive FS (Windows) `nav.ts` схлопывается с `Nav.tsx` → `import from './Nav'` в барреле резолвится в хелпер, билд падает `MISSING_EXPORT "Nav"`. Грабля session 2026-07-05.
- **`lessons` — тот же канон, что `library`:** singleton `lessonsStore` (Solid `createStore`, НЕ XState), `api.ts` с явным `apiBase`, `useApiBase()` в блоках, `useEmitOptional`, phantom `__events`, вложенная регистрация `Learn.Lessons.{List,View,Concepts,Concept,Rules,Rule}` (codegen-quirk аналогичен `Library.*` — `ILessonsListEvents`/`ILessonsViewEvents`/`IConceptsEvents`/`IRulesEvents`/`IRuleEvents` типизируются вручную прямым импортом из `@capsuletech/web-learn/lessons`). `LessonsNav` (под-навигация `concepts\|rules`) — ПЛОСКИЙ ключ `Learn.LessonsNav` (как `LibraryNav`), `useEmit` (не optional) + derived-active из роутера; `ILessonsNavEvents.onLessonsNavigate` payload = segment-id (зеркало `onLibraryNavigate`).
- **Markdown-тела концептов/правил обёрнуты в `Prose`** (`@capsuletech/web-ui/prose`), НЕ голый `<div innerHTML>`. `Prose` даёт типографику rendered-markdown (заголовки/списки/таблицы/код) на design-tokens — без неё Tailwind preflight сбрасывает браузерные стили и грамматические таблицы выглядят кашей. Собственных стилей `Markdown` не добавляет (канон «примитивы props-only»).
- **Дриллы правила = дриллы урока (общий чекер).** `Learn.Lessons.Rule` переиспользует internal `Drill` как есть; `openRule` (как `open` урока) сбрасывает эфемерный интерактив (`resetDrills`) — переход на другое правило/урок начинает практику с чистого листа. Списки концептов/правил (как `lessons`-список) `close` НЕ чистит — только выбор/деталь.
- **`lessonsStore.resetDrills` чистит map'ы через `reconcile({})`, НЕ `setState('answers', {})`.** Solid `createStore` при передаче объекта на ключ-путь **мёржит** его (пустой объект ничего не чистит → старые ответы залипают между уроками). `reconcile({})` реально заменяет. Грабля закрыта тестом `open resets ephemeral drill state`.
- **Дрилл-интерактив: ключ ответа НЕ на фронте.** Item'ы урока санитизированы бэком (`{index,promptRu,context}`) — проверка только через `POST /learn/drills/{id}/check` (канон user «фронт = интерфейс»). `answers`/`verdicts` — эфемерны (не персистим; прогресс = фаза 3).
- **Markdown тел концептов/правил — через `@capsuletech/web-docs` `renderMarkdown`** (`lessons/Markdown.tsx`), `innerHTML` курируемого lang-vault контента. НЕ добавляли markdown-dep. Solid `innerHTML`-проп biome НЕ флагует (в отличие от React `dangerouslySetInnerHTML`) — suppression не нужен.
- **⚠️ architect-TODO (surface):** снесён subpath `./lesson` — в `tsconfig.base.json` остался dangling-alias `@capsuletech/web-learn/lesson` (строка ~48) и НЕТ `@capsuletech/web-learn/lessons`. Правка `tsconfig.base.json` paths — зона architect (см. «Не трогает»). Для app-mount `Learn.Lessons.*` и manual-typing событий из `/lessons` alias нужен. **Owner не правит `tsconfig.base.json` сам** — зафлажено architect'у.
- **⚠️ app-wiring iter 2 (surface, зона `apps/learn/`):** пакетные блоки теперь URL-driven — `Concept`/`Rule`/`RuleDrills` ждут `id`-проп, а `Concepts`/`Rules`/`Concept` эмитят `on{Concept,Rule}Select`. Пока апп-страницы (`_workspace/lessons/{concepts,rules,_index}.tsx`) рендерят блоки БЕЗ `id` и не ловят эти события → деталь показывает fallback «Выберите …». Нужна апп-правка (owner-apps/architect): route-param → `id`-проп, `Features.App` ловит `on{Concept,Rule}Select` → `router.goTo`, `rules.tsx` монтирует `Learn.Lessons.RuleDrills` в `rightBar` (сейчас там заглушка `<div>drills</div>`). НЕ моя зона — пакет самодостаточен и зелён, интеграция — отдельный бриф.
- **⚠️ nav-consolidation (surface, зона `apps/learn/`, follow-up пилота).** После дедупа Nav/Welcome `Features.App` больше не получит `onNavigate`/`onLibraryNavigate`/`onLessonsNavigate` — все nav-биндинги эмитят единый `onSegmentNavigate { nav, segment }`. Нужен один хэндлер (различает по `payload.nav`: `root`→корень workspace, `lessons`/`library`→под-раздел, делает `router.goTo`) вместо трёх. До апп-правки живой nav-роутинг может не работать — это ожидаемо (интеграция последним тактом, отдельный мини-бриф owner apps-learn). НЕ моя зона.
- **`Welcome`-биндинг bare не юнит-тестируется** — `Shell.Launcher` внутри зовёт `useEmitOptional` (non-throwing вне scope) — но собственных unit'ов у тонких композит-биндингов в `capsule.tsx` нет (тестируется сам `Shell.Launcher`/`SegmentNav` в web-shell). `library` блоки (`Words`/`Info`) ЮНИТ-тестируются bare — используют `useEmitOptional` (non-throwing вне scope), мокнутый через `vi.mock('@capsuletech/web-core', ...)` (прецедент `Shell.Picker`).
- **Smoke рендерит через `solid-js/web`** (manual host + dispose), НЕ через `@solidjs/testing-library` — её в репо нет; эталон (studio) тестирует так же.
- **Multi-entry vite build** — все 11 subpaths обязаны присутствовать в `dist/`.
- **`controllers` гнездо пустое** — `Controllers.Learn` появится при наполнении.
- **`libraryStore` — Solid `createStore`-singleton, НЕ XState/Feature.** `@xstate/solid` несёт живой баг подмены строки массива на reconcile (brief `core-xstate-solid-reconcile-corruption.md`, охота отдельная, owner-core) — library-флоу от него не зависит намеренно (mandate user 2026-07-04).
- **`libraryStore.load(apiBase, q?)` — `apiBase` явный параметр, НЕ читается из контекста.** Стор — модуль-level singleton (Solid `createStore` вне component-scope), `useContext` внутри него невозможен. Компоненты (`Search`/`Words`) читают `apiBase` через `useApiBase()` (`core/apiContext.ts`, провайдится `Learn.Provider`) и передают его в `load` явно.
- **`Learn.Library` — вложенный namespace-блок** (`Learn.Library.Search`/`.Words`/`.Info`), а не плоские top-level ключи. `CapsuleRegistryPlugin`-codegen per-component `.Events` aggregate (`packages.d.ts`) статически парсит AST только ПЛОСКИХ ключей `components:` — вложенные `Library.*` в агрегат не попадают. `IWordsEvents`/`IInfoEvents` типизируются вручную прямым импортом из `@capsuletech/web-learn/library` (не через `Learn.Library.Words.Events`). Не мой фикс (owner-builders зона codegen) — задокументировано, не блокер.
- **Speaker-клик в `WordTile` вызывает `stopPropagation`** — без UiProxy dedup-механики app-слоя (пакетный компонент — голый Solid), клик на вложенной кнопке иначе всплывает и триггерит родительский `onSelect` на Card.

## План рефакторинга / оптимизаций

```markdown
- [x] Skeleton scaffold (структура + регистрация + smoke) — 2026-06-28.
- [x] `library` — реальный UI + store + backend-fetch (Search/Words/Info, перенос из `apps/learn`) — 2026-07-04.
- [x] `lessons` — реальный UI + store + backend-fetch (List/View + дрилл-интерактив/чекер), снос старых `lesson/*`-скелетов (brief `learn-lessons-blocks.md`) — 2026-07-04.
- [x] `lessons` ИА iter 1 — вкладки Концепты/Правила (`Concepts`/`Concept`/`Rules`/`Rule` + `Nav`/`LessonsNav`), правило-с-дриллами («Практика»), Markdown→`Prose` (brief `learn-lessons-ia-blocks.md`) — 2026-07-05.
- [x] `lessons` ИА iter 2 — аккордеон-группы (category/kind, `Ui.Accordion`), URL-driven `id`-пропы + кэш-дедуп стора, сплит `Rule`/`RuleDrills`, wikilink/relatedRules-переходы, strip-H1, `LessonsWelcome` (brief `learn-lessons-three-pane.md`) — 2026-07-05.
- [x] Nav/Welcome dedup — снос Nav×2+Welcome×3, композиция `Shell.SegmentNav`/`Shell.Launcher` + сегменты зоны, единое `onSegmentNavigate` (brief `pilot-segment-nav-4-learn`) — 2026-07-05.
- [x] Списки на `Ui.List` (batch) + бейджи на `Ui.Badge`, снос `VocabList`-скелета (brief `lists-badge-2-learn`) — 2026-07-05.
- [ ] Наполнить остальные модули реальным UI (exercise/progress/guides/sentence-builder).
- [ ] Реализовать `Controllers.Learn` (useEmit-эмиссия доменных событий обучения).
- [ ] Backend-интеграция остальных модулей: `web-query` endpoints к `/learn/*` (ADR 055 D2).
- [ ] Создать owner-agent `owner-web-learn` (отдельный PR).
```

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit (smoke) | `src/__tests__/smoke.test.tsx` | рендер pure-display плейсхолдеров (Exercise dispatch/Progress/Tour/SentenceBuilder/Collections) |
| Unit | `lessons/__tests__/store.test.ts` | `loadList`/`open`/`close`, `setAnswer`/`check` (POST item_index+answer), сброс дрилла на `open` (regression `reconcile`) |
| Unit | `lessons/__tests__/List.test.tsx` | lazy-load на mount, клик → `open` (fetch урока) + emit `onLessonSelect` |
| Unit | `lessons/__tests__/View.test.tsx` | маршрут concepts→rules→drills (порядок), markdown-тела, дрилл-флоу correct/near_miss(хинт)/wrong/reveal, emit `onSpeak` |
| Unit | `lessons/__tests__/store.concepts-rules.test.ts` | `loadConcepts`/`loadRules`, кэш-по-id (`concept(id)`/`rule(id)`), **дедуп** `open*` (один fetch), cache-miss reset / cache-hit keep дрилла, `close` чистит кэш |
| Unit | `lessons/__tests__/Concepts.test.tsx` | lazy-load, **группы по kind** (порядок+ru-подписи+подзаголовки), развёрнут по умолчанию, `sortOrder`-порядок внутри, клик → emit `onConceptSelect` |
| Unit | `lessons/__tests__/Concept.test.tsx` | id-driven, title/principle/тело (**strip-H1**)/примеры, `Prose`, **relatedRules-чип → `onRuleSelect`**, **wikilink → `onConceptSelect`**, fallback |
| Unit | `lessons/__tests__/Rules.test.tsx` | lazy-load, **группы по category** (порядок+подписи), **свёрнут кроме группы активного id** (`aria-expanded`), `sortOrder`-порядок, клик → emit `onRuleSelect` |
| Unit | `lessons/__tests__/Rule.test.tsx` | id-driven тело в `Prose` (**strip-H1**), БЕЗ дриллов, wikilink → `onRuleSelect`/`onConceptSelect`, **неизвестный ref → `console.warn` no-op**, fallback |
| Unit | `lessons/__tests__/RuleDrills.test.tsx` | id-driven «Практика» из кэша, дрилл-флоу correct (общий чекер), emit `onSpeak`, **один fetch рядом с `Rule`** (общий кэш), fallback |
| Unit | `lessons/__tests__/refnav.test.ts` | **ленивый догруз** списка при промахе (`ensureLists`): wikilink к правилу/концепту при пустом списке → догруз → emit; unknown ref после догруза → warn no-op; повторный резолв не рефетчит (кэш); параллельные промахи → один in-flight fetch |
| Unit | `library/__tests__/store.test.ts` | `load`/`select`/`selected`, select-миграция между id (регрессия к app-слой багу) |
| Unit | `library/__tests__/Search.test.tsx` | keystroke → `load(apiBase, q)`, `apiBase` из `Learn.Provider` / дефолт |
| Unit | `library/__tests__/Words.test.tsx` | lazy-load on mount, `data-selected` миграция по тайлам (регрессия), emit `onWordSelect`/`onSpeak` |
| Unit | `library/__tests__/Info.test.tsx` | fallback без selection, рендер выбранного sense, emit `onSpeak` |

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
