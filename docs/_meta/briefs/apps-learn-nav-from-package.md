# Бриф: apps/learn — навигация из пакета (снос shapes/shellNavigation, Learn.Nav.Main)

**Зона:** owner apps-learn (`claude-scope -Scope apps-learn`). Правишь ТОЛЬКО `apps/learn/`. Коммить scope-тегом `apps-learn`, **НЕ пушить**.

**Порядок:** ПОСЛЕ пакетного брифа `web-learn-nav-consolidation.md` (он создаёт глобалы `Learn.Nav.*` / `Learn.Welcome.*`; без него app-рефы не резолвятся). Одна волна — между коммитами app временно сломан, это норма.

**Перед стартом:** прогони `cd apps/learn; pnpm capsule dev` — baseline.

---

## Зачем

Навигация переехала в пакет (`Learn.Nav.Main` — header-nav, был app-Shape). App перестаёт **владеть** навигацией — только монтит пакетный блок и роутит его generic-событие. Убираем дубль секций и рассинхрон путей.

## Правки

1. **Снести `src/shapes/shellNavigation.tsx`** — main-nav теперь пакетный (`Learn.Nav.Main`). Проверь grep'ом, что `Shapes.ShellNavigation` больше нигде не зовётся.
2. **`src/widgets/header.tsx`** — `<Shapes.ShellNavigation />` → `<Learn.Nav.Main />`. Остальной chrome (Appearance/ModeToggle/Picker'ы) без изменений. Ноль import'ов (эталон).
3. **Переименования глобалов** (пакет сменил ключи) — обнови все app-рефы:
   - `<Learn.Welcome />` → `<Learn.Welcome.Root />` (в `pages/_workspace/_index.tsx`).
   - `<Learn.LibraryNav />` → `<Learn.Nav.Library />`, `<Learn.LessonsNav />` → `<Learn.Nav.Lessons />` (в section-layout страницах `pages/_workspace/library/index.tsx`, `.../lessons/index.tsx`).
   - `<Learn.LessonsWelcome />` → `<Learn.Welcome.Lessons />`, `<Learn.LibraryWelcome />` → `<Learn.Welcome.Library />` (в соответствующих `_index.tsx`).
   - Grep по `apps/learn/src` на `Learn.LibraryNav|Learn.LessonsNav|Learn.LessonsWelcome|Learn.LibraryWelcome|Learn.Welcome\b` — поймать всё.
4. **`src/features/app.tsx`** — роутинг main-nav'а. `Learn.Nav.Main` эмитит `onSegmentNavigate { nav: 'root', segment }` — **существующая формула уже это роутит** (`nav === 'root' ? /${segment} : /${nav}/${segment}`), правок логики скорее всего НЕ нужно. Убедись: (а) все секции из `MAIN_SEGMENTS` имеют роут (`/lessons`, `/exercises`, `/progress`, `/library`, и `/guides` если пакет добавил guides в единый источник — роут `pages/_workspace/guides/` уже есть); (б) активная подсветка работает (derived в пакете через `useActiveSegment`).

## Verify (перед commit)

- `cd apps/learn; pnpm capsule dev` — грузится; header-nav рендерится (тот же вид), клик по секции роутит, активный пункт подсвечен; welcome-лаунчеры и sub-nav'ы (library/lessons) работают.
- Grep: ноль остатков старых ключей (`Shapes.ShellNavigation`, `Learn.LibraryNav`, `Learn.Welcome ` без `.Root` и т.д.) + ноль `import` в слоях.
- ⚠️ Живой eyeball `:8080/learn/` — финально за architect/user, пометь в отчёте.

Отчёт architect'у: тронутые/удалённые файлы, менялась ли формула роутинга, хвост dev, что осталось для eyeball.

## Готово =
`apps/learn` не содержит своей навигации — монтит `Learn.Nav.Main` в хедере, роутит generic-событие; старые ключи обновлены; ноль import'ов; dev зелёный.
