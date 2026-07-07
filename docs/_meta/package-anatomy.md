# Анатомия domain-пакета (канон) — ПО эталону `web-learn`

> **Статус:** канон (2026-07-06). Эталон анатомии domain-host-пакета = `packages/web/workspace/learn`.
> Любой апп-host-пакет класса `workspace` (learn, studio, будущие) раскладывается **буквально по этой схеме** ([[feedback_mirror_means_literal_mirror]]).

Domain-host-пакет = самодостаточный пакет, который апп подключает одной строкой
(`packages: ['@capsuletech/web-<x>']`) и получает набор connected-блоков как глобалы
`<Namespace>.*` (ADR 033). Внутри — **три яруса**, снизу вверх:

```
src/
  shared/<atom>/     ← атомы: переиспользуемые низкоуровневые куски (свой store опционально)
  core/              ← cross-cutting: провайдер, контексты, SSOT-сторы, координация, controllers
  modules/<block>/   ← блоки-модули: одна сущность/панель = одна папка со своим стором
  capsule.tsx        ← регистрация (defineCapsuleModule) → глобалы <Namespace>.*
  index.ts           ← корневой barrel (публичный API пакета)
```

## Правило зависимостей (направление импортов внутри пакета)

```
shared  ←  core  ←  modules
```

- **`shared/`** — самый низ. Атомы НЕ импортят `core/` и `modules/` (только внешние пакеты + solid).
- **`core/`** — может использовать `shared/`. НЕ импортит `modules/` (иначе cross-cutting завязан на блок — это признак, что кусок на самом деле cross-cutting и должен переехать в `core/`).
- **`modules/`** — использует `core/` (провайдер/контексты/сторы/хуки) и `shared/` (атомы). Модуль НЕ импортит другой модуль напрямую (горизонталь) — координация только сверху (`core/`) или через события.

> Практический тест: **«если файл читает/пишет несколько модулей — он cross-cutting → `core/`».** Пример: `useStudioMode` (режим из URL) читают document, canvas-binding, inspector, info → `core/`, не `navigation/`.

## `shared/<atom>/` — атомы

Переиспользуемый низкоуровневый кусок, который потребляют несколько модулей. У атома может быть **свой store** (в learn `shared/words/store.ts`). Типичное наполнение папки:

```
shared/words/  →  store.ts  api.ts  types.ts  Words.tsx  WordTile.tsx  index.ts
```

Промоушен: если что-то из модуля начинают тянуть ≥2 модуля — оно переезжает в `shared/` и регистрируется top-level (в learn `Words`/`Search`/`Markdown` были `Library.Words` → стали `Learn.Words`).

## `core/` — cross-cutting

Всё, что не принадлежит одному блоку и живёт «над» модулями:

| Файл | Роль | Пример learn | Пример studio |
|---|---|---|---|
| `provider.tsx` | корневой провайдер (`<Namespace>.Provider`) | `LearnProvider` (apiBase context) | `StudioProvider` (DnD+Remote+binding) |
| `apiContext.ts` / `*Context.ts` | контексты, прокидываемые вниз | `ApiBaseContext` | `canvasContext` |
| `interfaces.ts` | доменные контракты пакета (если есть cross-cutting типы) | `IConcept`/`IExercise`/… | — |
| SSOT-store | центральный стор, если модель централизована | — (в learn сторы по модулям) | `document.ts` (дерево-SSOT) |
| координация | top-down навигация/связки | `refnav.ts` | `CanvasBinding`, `useStudioMode` |
| `controllers/` | HCA-adapter контроллеры (если есть) | `core/controllers/` | — (тонкие/нет) |
| `index.ts` | barrel core (провайдер + контексты + interfaces) | — | — |

> Не изобретать слоты: `interfaces.ts` / `controllers/` заводятся **только если есть содержимое**. Пустых папок «для симметрии» не создаём.

## `modules/<block>/` — блоки

Одна сущность или панель = одна папка. Каждая **самодостаточна** (`capsule` импортит прямо из папки). Каноническое наполнение:

```
modules/<block>/  →  store.ts   (свой стор, если у блока есть состояние)
                     api.ts     (data-слой блока, если ходит в BFF)
                     types.ts   (типы блока)
                     segments.ts(nav-сегменты, если блок навигируемый)
                     <Block>.tsx / <Blocks>.tsx  (презентация; деталь vs список)
                     index.ts   (barrel — экспорт connected-блока)
                     __tests__/
```

Конвенция имён: **`<Entity>` = деталь, `<Entities>` = список** (`Lesson`/`Lessons`, `Concept`/`Concepts`, `Rule`/`Rules`). Регистрируются ПЛОСКО (`Learn.Lesson`, не `Learn.Lessons.View`) — плоские ключи штатно попадают в codegen-агрегат `.Events`.

Презентация внутри модуля остаётся **stateless и тестируемой отдельно** от connected-обёртки ([[feedback_studio_controller_thin]], [[feedback_presentation_in_component]]).

## `capsule.tsx` + `index.ts`

- **`capsule.tsx`** — `defineCapsuleModule({ name, components })`. Импортит блоки из их папок (`./modules/*`, `./shared/*`, `./core`). Ключи `components` = публичные глобалы `<Namespace>.*`. **При рефакторе раскладки ключи глобалов не меняются** — меняются только источники импортов (рефактор поведенчески-нейтрален для аппа).
- **`index.ts`** — корневой barrel публичного API. Минимум = `export * from './core'`. Если у пакета есть публичные субпаты (`./manifests`, `./palette`) — реэкспорт из новых мест, имена субпатов (`package.json exports` + `tsconfig.base.json`) сохраняются.

## Чек-лист «пакет по канону»

1. Три яруса `shared/ core/ modules/` — не плоско, cross-cutting не вперемешку с блоками.
2. Импорты идут только вниз (`modules→core→shared`); нет `core→modules`.
3. Каждый модуль самодостаточен (папка со своим стором/api/типами/презентацией/index).
4. Cross-cutting (провайдер, контексты, SSOT-стор, координация) — в `core/`.
5. Атомы (переиспользуют ≥2 модуля) — в `shared/`.
6. Регистрация в `capsule.tsx`; ключи глобалов стабильны при внутренних переездах.
7. Нет пустых «симметричных» слотов — слот заводится только под содержимое.

## Связи

- Канон композиции UI (карточка=сущность, список=пресеты) — [[component-model]] (`docs/01-architecture/component-model.md`).
- «Зеркало = буквальное зеркало» — [[feedback_mirror_means_literal_mirror]].
- Регистрация пакета (ADR 033), субпаты — `docs/_meta/web-studio.md` / `docs/_meta/web-learn.md` (AI-anchors).
