# OWNERSHIP — зона `apps/*` (owner-apps)

Один owner на ВСЕ аппы. Аппы — витрина фреймворка: канон здесь важнее скорости.
Owner-apps знает СЛОИ и КАК ПИСАТЬ; доменные решения и cross-package — эскалация architect'у.

## 🚨 Железные правила (нарушение = стоп и переделать)

1. **НИКАКИХ `import` ни в одном файле слоёв** (`src/**`). Всё уже есть:
   - wrapper'ы `Page/Widget/View/Shape/Controller/Feature/Entity` — глобалы (auto-import);
   - реестры `Widgets/Views/Shapes/Controllers/Features/Entities` — глобалы;
   - `Ui` — 1-й аргумент wrapper'а; control-flow — **`Ui.Flow.*`** (`Flow.Show`, `Flow.For`,
     `Flow.Switch/Match/Index/Dynamic`) — НЕ `import { For, Show } from 'solid-js'`;
   - пакетные глобалы (`Shell.*`, `Learn.*`, `WebStudio.*`, `Layouts.*`) — через
     `packages:` в `capsule.app.ts`;
   - хуки (`useCtx`, `useRouter`, ...) — auto-import. `interface`/`type` объявления — можно.
   Проверка: `Select-String -Path src -Pattern "^import "` → 0 строк.
2. **Каждый файл слоя заканчивается `export default <Name>;`** (типизация slot-кодгена).
3. **Повторяющиеся data-плитки/списки = Shape** (ADR 036, two-phase), НЕ ручной map+вёрстка
   во View. «Сущность → Entity, как рисовать → Shape». Batch-шаблоны: `ui.Group`, `ui.List`,
   `ui.DataTable`; item-компонент = View (`item: { use: Views.X, props: (it) => ({...}) }`).
4. **Композиция только в Widget.** View не использует другую View; Widget склеивает
   View/Shape + Controller/Feature.
5. **Widget/Page получают store 2-м аргументом** `(Ui, store, props)` — НЕ `useCtx()`
   в юзер-виджете. store опционален → гард (`(store?.ctx as any)?.data?.X`).
6. **В хендлере Feature/Controller свой стейт = `store`** (`store.ctx.data.X`);
   параметр `context` = данные ИНИЦИАТОРА (при баббле `next()` — контекст ребёнка!).
7. **События**: пакетные блоки эмитят named-события → ловим `Feature<Pkg.X.Events>`
   (top-level handler). UI-элементы — `meta={{tags:[...]}}` + `payload={...}` →
   onClick/onInput в ближайшей Feature; наверх — пассивный `return next()`.
8. **`class` в app-слоях ЗАПРЕЩЁН ПОЛНОСТЬЮ** (и `<style>`-блоки тоже). Только props
   Ui-примитивов (variant/size/gap/wrap/padding/…) — дизайн-тонкости (hover, selected,
   отступы) НЕ переопределяются на уровне аппа, это стандарты kit'а. Не хватает
   пропа → выписать в бриф owner-ui, НЕ лепить class. Типы данных — из Entity
   (`Entities.X.Row`), НЕ ad-hoc `interface IXxxProps` на данные.
9. **API только в Feature** (`services.api.<ns>.<endpoint>()`); endpoints в
   `src/endpoints/<ns>.ts` через `defineEndpoint`, response-схемы = точная форма бэка
   (zod strip: незадекларированное поле МОЛЧА исчезнет). Новые поля бэка → сразу в схему.

## Слои (что где живёт)

| Папка | Слой | Пишем |
|---|---|---|
| `entities/` | domain-данные | `Entity(({zod}) => ({schema, defaults?}))`, БЕЗ UI |
| `views/` | stateless-вёрстка | `View((Ui, props) => JSX)`; только Ui.* + `data-meta`; ноль состояния |
| `shapes/` | презентация данных | `Shape((ui,{zod})=>({schema,as}), (ui,props)=>({config}))` |
| `controllers/` | FSM поведения UI | `Controller((services) => schema)` |
| `features/` | логика/IO | `Feature((services) => schema)`; только тут API/side-effects |
| `widgets/` | композиция | `Widget((Ui, store, props) => JSX)` |
| `pages/` | роут-layout | `Page((Ui) => JSX)`; файловая структура = роуты; НЕ шадоуить глобалы именем const |
| `endpoints/` | API-контракты | `defineEndpoint`; `base` — из `api.bases` |

Namespace = вложенность папок: `widgets/library/words.tsx` → `Widgets.Library.Words`.

## Конфиги аппа

- `capsule.config.ts` — devServerPort + **`base: '/<app>/'`** (ADR 068: все фронты — один
  origin, dev-gateway `docker/gateway/` :8080; новый апп = локация в nginx.conf).
- `capsule.app.ts` — `packages:` (пакетные глобалы), `api.bases` (после мержа
  builders-dev-api-proxy — относительный `'/api'`), `meta.tags`.

## Проверки перед сдачей (обязательные, по порядку)

1. `CAPSULE_CI=1 node ../../packages/cli/bin/capsule.mjs build` (из папки аппа) — зелёный.
   Голый tsc по аппам ВРЁТ — только capsule build.
2. `pnpm exec biome check apps/<app> --write` → повторный check без ошибок.
3. `apps/<app>/.capsule/dev-diagnostics.log` — без error-строк (запусти dev, смотри стрим;
   агент судит по реальности компиляции, не по памяти).
4. Grep на `^import ` → 0.

## Git

Commit-only, без push/веток (хук режет main — оставь изменения в дереве, коммитит
architect после ревью). Скоуп коммита architect'а: `feat(apps-<app>): ...`.

## Эскалации (НЕ делать самому)

- Правки `packages/*`, `backend/*`, `docker/*`, `.github/*` — чужие зоны.
- Недостающий примитив/проп в kit, gap фреймворка — флаг architect'у.
- Изменение контракта endpoint'а требует бэк-правки — флаг (контракт-каскад).
