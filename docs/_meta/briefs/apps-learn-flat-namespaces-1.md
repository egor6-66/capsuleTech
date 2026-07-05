# Brief — apps/learn: перевести рефы на плоские `Learn.*` неймспейсы (scope `apps-learn`)

**Контекст:** пакет `@capsuletech/web-learn` раздроблён по сущностям и промоутнул **плоские
неймспейсы** (`learn-lessons-split` + `learn-shared-layer`). Апп всё ещё зовёт старые
nested-глобалы `Learn.Lessons.*` / `Learn.Library.Search|Words` → рантайм падает (`undefined`
компонент). Перевести рефы 1:1. **Только переименование глобалов** — логику/раскладку слотов НЕ
трогать.

## Маппинг (старое → новое)
| было | стало |
|---|---|
| `Learn.Lessons.Concept` | `Learn.Concept` |
| `Learn.Lessons.Concepts` | `Learn.Concepts` |
| `Learn.Lessons.Rule` | `Learn.Rule` |
| `Learn.Lessons.Rules` | `Learn.Rules` |
| `Learn.Lessons.RuleDrills` | `Learn.RuleDrills` |
| `Learn.Lessons.View` | `Learn.Lesson` |
| `Learn.Lessons.List` | `Learn.Lessons` |
| `Learn.Library.Search` | `Learn.Search` |
| `Learn.Library.Words` | `Learn.Words` |
| `Learn.Library.Info` | **без изменений** (`Learn.Library.Info`) |

## Файлы (JSX-рефы — ломаются, чинить обязательно)
- `pages/_workspace/lessons/concepts/index.tsx:19` — `<Learn.Lessons.Concepts id=…/>` → `<Learn.Concepts id=…/>`
- `pages/_workspace/lessons/concepts/[conceptId].tsx:10` — `<Learn.Lessons.Concept id=…/>` → `<Learn.Concept id=…/>`
- `pages/_workspace/lessons/concepts/_index.tsx:6` — `<Learn.Lessons.Concept/>` → `<Learn.Concept/>`
- `pages/_workspace/lessons/rules/index.tsx:24,26` — `<Learn.Lessons.Rules id=…/>` → `<Learn.Rules id=…/>`;
  `<Learn.Lessons.RuleDrills id=…/>` → `<Learn.RuleDrills id=…/>`
- `pages/_workspace/lessons/rules/[ruleId].tsx:10` — `<Learn.Lessons.Rule id=…/>` → `<Learn.Rule id=…/>`
- `pages/_workspace/lessons/rules/_index.tsx:6` — `<Learn.Lessons.Rule/>` → `<Learn.Rule/>`
- `pages/_workspace/library/explorer.tsx:13-14` — **раскомментить** и переименовать:
  `{/*<Learn.Library.Search/>*/}` → `<Learn.Search/>`; `{/*<Learn.Library.Words/>*/}` → `<Learn.Words/>`
  (были закомменчены как временный фикс краша; библиотеке они нужны).

## Feature-события (типы + комменты)
- `features/lessons.tsx` — если ловит события типизированно через `Learn.Lessons.{List,Rule,...}`
  (`EventsOf<typeof Learn.Lessons.List>` / `.Events`) — перевести на плоские
  (`Learn.Lessons`/`Learn.Rule`/`Learn.Concept`…). Имена САМИХ событий (`onLessonSelect`/`onRuleSelect`/
  `onConceptSelect`/`onSpeak`) НЕ меняются — только источник/тип-реф. Комменты про `Learn.Lessons.*`
  обновить.
- `features/app.tsx` — комменты `Learn.Library.Words/Info` → актуальные (`Learn.Words`/`Learn.Library.Info`).
- Прочие комменты в `pages/_workspace/lessons/**` с `Learn.Lessons.*` — освежить.

## Verify
`nx run <apps-learn-project>:typecheck` + `:build`. Грепом: `Learn.Lessons.` и
`Learn.Library.Search|Words` в `apps/learn/src` больше нет (кроме `Learn.Library.Info`). Живой
learn через gateway: концепты/правила/библиотека грузятся без `Cannot read properties of undefined`.
