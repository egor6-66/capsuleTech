# Бриф: web-learn — консолидация навигации (Learn.Nav.* / Learn.Welcome.*, shared/segments)

**Зона:** owner-learn (`packages/web/workspace/learn/`). Коммить scope-тегом `learn`, **НЕ пушить** — push/merge architect ([[feedback_agents_commit_only_user_pushes]]).

**Перед стартом:** `docs/_meta/package-anatomy.md` (канон 3 яруса), `packages/web/workspace/learn/OWNERSHIP.md`; `pnpm --filter @capsuletech/web-learn test` — зелёный baseline.

---

## Зачем (канон)

Навигация «размазана»: main-nav живёт в АППЕ (`apps/learn/src/shapes/shellNavigation.tsx`), sub-nav'ы и welcome'ы навалены **inline JSX-константами** в `capsule.tsx`, `segments.ts` раскиданы по модулям. Список секций **дублируется** app-shape ↔ package (+дрейф: в app-nav есть `Guides`, в `LEARN_SEGMENTS` нет). Приводим пакет к анатомии: nav — пакетный концерн, единый источник сегментов, чистые папки, тонкий `capsule.tsx`.

**Именование (решение user):** не плодить `MainNav`/`LibraryNav`/`LessonsNav` — вложенный неймспейс **`Learn.Nav.{Main,Library,Lessons}`** + симметрично **`Learn.Welcome.{Root,Library,Lessons}`**.

> **Вложенность тут безопасна** (в отличие от кейса lessons, где ушли к плоским ради codegen `.Events`): nav/welcome-блоки **не имеют своих `__events`** — событие `onSegmentNavigate` типизируется из `Shell.SegmentNav.Events`, аггрегировать в `Learn.Nav.Events` нечего. Вложенность влияла только на `.Events`-агрегат, не на рендер (прецедент: `Learn.Library.Info` вложенный рендерился штатно). **Проверь на verify**, что registry-codegen поднимает вложенные `Learn.Nav.*`/`Learn.Welcome.*`.

---

## A. `shared/segments/` — единый источник сегментов

Создать `src/shared/segments/` (атом: читают ДВА модуля — navigation + welcome → по анатомии это `shared/`, не per-module). Перенести туда данные из `modules/welcome/segments.ts`, `modules/library/segments.ts`, `modules/lessons/segments.ts`:

- `MAIN_SEGMENTS` (был `LEARN_SEGMENTS`) — **сверь дрейф:** единый источник = ВСЕ top-level секции. Сейчас `LEARN_SEGMENTS` = lessons/exercises/progress/library, а app-nav добавлял `guides`. Приведи к одному списку (вероятно +`guides` — есть `modules/guides/` + роут `pages/_workspace/guides/`). Если сомнение по `guides` в welcome-лаунчере — пометь в отчёте (surface, [[feedback_surface_dont_silently_chase]]).
- `LIBRARY_SEGMENTS`, `LESSONS_SEGMENTS` — перенести как есть + их типы.
- `shared/segments/index.ts` — реэкспорт всех наборов + типов.
- Удалить старые `modules/*/segments.ts` + `modules/welcome/segments.ts`.

## B. `modules/navigation/` — nav-блоки пакета

Создать `src/modules/navigation/` с тремя connected-блоками (импорт сегментов из `../../shared/segments`):

- **`MainNav.tsx`** (→ `Learn.Nav.Main`) — **новый** header-nav (был app-Shape). Header-лук + event, **web-shell НЕ трогаем**:
  - рендер через `Shell.Header.Navigation` (batch-контейнер: `data={MAIN_SEGMENTS}` + `item`);
  - `item` = кнопка (`ui.Button variant="ghost"`), клик → `emit('onSegmentNavigate', { source: 'Learn.Nav.Main', payload: { nav: 'root', segment: id } })`;
  - active-state: `useActiveSegment(MAIN_SEGMENTS.map(s=>s.id))` (route-prefix-агностично, как SegmentNav) → подсветка активного (`aria-current`/variant);
  - emit: `useEmitOptional` (не useEmit — может рендериться вне scope). Механизм — зеркало `Shell.SegmentNav` (`packages/web/domain/shell/src/ui/segmentNav/segmentNav.tsx`), но поверх header-контейнера. Пакет НЕ знает путей — только id сегментов.
- **`LibraryNav.tsx`** (→ `Learn.Nav.Library`) — перенести inline-биндинг из `capsule.tsx`: `<Shell.SegmentNav segments={LIBRARY_SEGMENTS} nav="library" />`.
- **`LessonsNav.tsx`** (→ `Learn.Nav.Lessons`) — аналогично: `<Shell.SegmentNav segments={LESSONS_SEGMENTS} nav="lessons" />`.
- `modules/navigation/index.ts` — barrel.

## C. `modules/welcome/` — welcome-блоки

Перенести inline-лаунчеры из `capsule.tsx` в файлы (импорт сегментов из `shared/segments`):

- `Welcome.tsx` (→ `Learn.Welcome.Root`) — `<Shell.Launcher segments={MAIN_SEGMENTS} nav="root" title="Learn" … />`.
- `LessonsWelcome.tsx` (→ `Learn.Welcome.Lessons`), `LibraryWelcome.tsx` (→ `Learn.Welcome.Library`) — аналогично из inline.
- `modules/welcome/index.ts` — barrel (только блоки; segments ушли в shared).

## D. `capsule.tsx` — тонкий

Убрать ВСЕ inline `const LibraryNav = …`/`Welcome = …`. Импортить готовые блоки из `./modules/navigation` и `./modules/welcome`. Регистрация — вложенная:

```
Nav: { Main, Library, Lessons },
Welcome: { Root, Library, Lessons },
```

Остальные ключи (`Exercise`/`Progress`/`Lesson`/`Concept`/…) без изменений. Обновить докстринг под новую раскладку.

> **Ключи меняются** (`Learn.LibraryNav`→`Learn.Nav.Library`, `Learn.Welcome`→`Learn.Welcome.Root`, и т.д.) → app временно сломан между твоим и app-коммитом (companion-бриф `apps-learn-nav-from-package.md`, та же волна — норма).

---

## Verify (перед commit)

- `pnpm --filter @capsuletech/web-learn test` — зелёный (тесты сегментов/welcome переезжают вместе).
- `pnpm nx run @capsuletech/web-learn:typecheck` + `:build` — 0 / собирается (субпаты не ломаются).
- **Registry-codegen поднимает вложенные `Learn.Nav.*` / `Learn.Welcome.*`** — проверь (собери апп или глянь `.capsule/registry`). Если вложенность не поднимается — СТОП + эскалируй (это регресс механизма регистрации, не глушить).
- Grep: в `src/` нет остатков `LEARN_SEGMENTS`/старых `modules/*/segments.ts`; `capsule.tsx` без inline-JSX-nav.

Отчёт architect'у: тронутые/новые/удалённые файлы, решение по `guides`-дрейфу, хвост test/typecheck/build, статус codegen вложенных ключей.

## Готово =
`shared/segments/` = единый источник; `modules/navigation/` (Nav.Main/Library/Lessons) + `modules/welcome/` (Welcome.Root/Library/Lessons) — чистые папки; `capsule.tsx` тонкий; ключи вложенные и codegen их поднимает; test/typecheck/build зелёные.
