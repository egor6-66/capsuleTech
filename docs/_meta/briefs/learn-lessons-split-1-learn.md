# Brief — learn: раздробить `lessons/`-монолит по сущностям + rename + сплит стора (scope `learn`)

**Канон (user):** `modules/lessons/` — фейковая «фича», а внутри **4 разные сущности** (lesson /
concept / rule / drill) свалены в кучу: монолитный `lessonsStore` на все четыре, блоки + api + types
вперемешку, имена не по сути (`View` = «выбранный урок», `List` = «список уроков»). Та же болезнь,
что была у `library` → лечим тем же способом: **раздробить по сущностям**.

## Именной канон (сквозной)
- `<Entity>` = **деталь**, `<Entities>` = **браузер/список**, `<Entity>Card` = **плитка**.
- **Плоские entity-неймспейсы:** `Learn.Lesson`/`Learn.Lessons`, `Learn.Concept`/`Learn.Concepts`,
  `Learn.Rule`/`Learn.Rules` (не `Learn.Lessons.Concept` — nested-группировку убираем; она и порождала
  кашу). `View` → **`Lesson`**, `List` → **`Lessons`**.

## 1. Раздробить `modules/lessons/` на per-entity юниты
Каждый юнит = **свой стор-слайс + api + types + блоки + index**:

| папка | блоки | стор | api | types |
|---|---|---|---|---|
| `modules/lessons/` | `Lesson` (было `View`), `Lessons` (было `List`), `LessonCard` | lessonsStore (lessons/selectedId/current/loading/opening; loadList/open/close) | fetchLessons/fetchLesson | ILessonSummary/ILessonDetail |
| `modules/concepts/` | `Concept`, `Concepts` | conceptsStore (concepts/conceptCache/inflight; loadConcepts/openConcept) | fetchConcepts/fetchConcept | IConceptSummary/IConcept |
| `modules/rules/` | `Rule`, `Rules`, `RuleDrills` | rulesStore (rules/ruleCache/inflight; loadRules/openRule) | fetchRules/fetchRule | IRuleSummary/IRuleDetail |
| `modules/drills/` | `Drill` | drillsStore (answers/verdicts/checking; setAnswer/check/resetDrills) | checkDrill | ICheckResult/IDrill |

`segments.ts` (nav-данные) — раскидать по сущности (lessons/concepts/rules) или в `shared/` если общий.

## 2. Сплит стора (4 независимых + координация)
`lessonsStore` рвётся на `lessonsStore`/`conceptsStore`/`rulesStore`/`drillsStore` (тот же Solid
`createStore`-канон, каждый владеет своим стейтом). **Направление координации — только сверху вниз**
(higher-order сущность зовёт lower, не наоборот):
- `lessons.open()` сбрасывает дриллы → зовёт `drillsStore.reset()` (lesson → drill, ок).
- `lessons.close()` чистит concept/rule-кэши + дриллы → зовёт `conceptsStore.reset()`/`rulesStore.reset()`/
  `drillsStore.reset()`.
- `rules.openRule()` на cache-miss сбрасывает дриллы → `drillsStore.reset()` (rule → drill, ок).
- **`ensureLists`** (грузит concept+rule списки для `refnav`) — cross-entity → **вынести в координатор**
  `core/refnav.ts` (или `core/lists.ts`): зовёт `conceptsStore.loadConcepts` + `rulesStore.loadRules`.
- `refnav.ts` → в `core/` (cross-cutting, координирует обе сущности).
- **Запрещено:** drillsStore импортить lesson/rule; conceptsStore импортить rulesStore. Только
  координатор (core) знает про несколько сторов.

## 3. Тело `Lesson`/`RuleDrills` — НЕ трогаем (отложено с дриллами)
`Lesson` (было `View`) и `RuleDrills` встраивают `Drill` (отложен). В ЭТОМ брифе — **только
move + rename + сплит стора/api/types + перевод импортов**. Тело (композиция concept/rule→Article,
список дриллов) доводим ОТДЕЛЬНО с дриллами. Логику блоков (emit/openX/id-prop) сохранить 1:1.

## 4. Регистрация (`capsule.tsx`)
Плоские неймспейсы: `Learn.Lesson`, `Learn.Lessons`, `Learn.Concept`, `Learn.Concepts`, `Learn.Rule`,
`Learn.Rules`, `Learn.RuleDrills`. Убрать nested `Lessons: {...}`. Импорты из новых per-entity
`modules/*`. Emit-source строки блоков обновить под новые имена/неймспейсы
(`'Learn.Lessons.View'` → `'Learn.Lesson'` и т.д.).

## 5. App-сторона (architect, помечаю — landing вместе)
Апп-рефы `Learn.Lessons.{Concepts,Concept,Rules,Rule,RuleDrills,List,View}` → плоские
`Learn.{Concepts,Concept,Rules,Rule,RuleDrills,Lessons,Lesson}` в `apps/learn/src/pages/_workspace/lessons/**`
+ `features/app.tsx` (источники событий). Делает architect/apps-learn owner.

## Не в scope (отдельно, не бандлить)
`library/Info` (деталь слова) → консистентность имени (`Learn.Word`?) и место — ОТДЕЛЬНЫЙ разговор,
здесь не трогаем.

## Тесты / verify
Перенести `__tests__` под новые папки, обновить импорты (per-entity сторы). Направление:
грепом `drills`/`concepts`/`rules` сторы не импортят друг друга (только `core/`-координатор).
`nx run @capsuletech/web-learn:typecheck` + `:test` + `:build`. `Learn.Lessons.*`-nested в пакете
больше нет — только плоские `Learn.<Entity>`/`<Entities>`.
