# Бриф: web-studio — снос канваса + убить `controllers/` + завести `providers/`

**Зона:** owner-studio (`packages/web/studio/`). Ветка уже создана architect'ом: `feat/host-remote-bridge`. **Коммить в неё** (scope-тег `studio`), **НЕ пушить** — push делает architect/user после verify ([[feedback_agents_commit_only_user_pushes]]).

**Перед стартом прочитай:** `packages/web/studio/OWNERSHIP.md`, `docs/_meta/web-studio.md` (если есть), прогони `pnpm --filter @capsuletech/web-studio test` (зелёный baseline до правок).

---

## Зачем (канон)

1. `controllers/` — **мислейбл**: внутри нет ни одного HCA-контроллера (нет FSM/ControllerContext/ловли событий). Это connected-контейнеры (read singleton → render презентацию). `palette/` и `navigation/` уже самодостаточны (capsule.ts импортит прямо из папки) — это **целевая модель**, равняем остальных на неё.
2. `CreatorRoot` — это провайдер (`<DnDProvider>`), а не контроллер. Переезжает в `providers/` под честным именем `WebStudio.Provider`.
3. Канвас студио (`WebStudio.Canvas` = Renderer-в-iframe) **app-side уже мёртв** (playground-виджет `Widgets.Studio.Canvas` рендерит `<Remote.View>`, не пакетный canvas). Сносим целиком; новый канвас (universal-canvas remote) проектируется отдельно ПОЗЖЕ.

**Этот рефактор поведенчески-нейтрален** (перенос/удаление файлов, рендер остальных модулей не меняется). Миграция владения состоянием (`composition`/`selection` синглтоны → внутрь провайдера) — **НЕ в этом брифе**, отдельный следующий шаг. Синглтоны `composition.ts`/`selection.ts` оставляем как есть.

---

## A. Снос канваса

Удалить:
- `src/canvas-frame/` (CanvasFrame.tsx, index.ts + `__tests__` если есть)
- `src/canvas-style/` (CanvasStyle.tsx, state.ts, index.ts + `__tests__`)
- `src/controllers/WebStudioCanvas.tsx` + `src/controllers/__tests__/WebStudioCanvas.test.tsx`
- `src/controllers/WebStudioCanvasStyle.tsx`

Правки:
- `src/capsule.ts` — убрать из `components` ключи `Canvas`, `CanvasStyle` + их импорты + строки в докстринге.
- `vitest.config.ts` — убрать обвязку/комментарий про `canvas-style` тянущий `@capsuletech/web-shell/ui` (строка ~32) — она больше не нужна.
- Проверить: после удаления `canvas-style` синглтоны `useCanvasTheme`/`useCanvasDark` нигде не остались импортированы (их единственные consumer'ы — удаляемый Canvas + сам CanvasStyle).

> `composition`/`selection` НЕ трогать — после сноса канваса их читают Tree/Info/Props/Palette (живые). `insertPreset` (composition) временно без caller'а — это ОК, оставляем.

## B. Убить `controllers/` — свернуть контейнеры в папки-модули

Для каждого: перенести connected-контейнер из `controllers/` в его папку-модуль, **сохранив stateless-презентацию** (напр. `tree/Tree.tsx` остаётся чистой, рядом ложится connected-обёртка). Папка экспортит connected-компонент через свой `index.ts`; `capsule.ts` импортит из папки (как уже сделано для `palette`/`navigation`).

- `controllers/WebStudioTree.tsx` → `tree/` (+ `tree/index.ts` экспорт)
- `controllers/WebStudioInfo.tsx` → `info/`
- `controllers/WebStudioProps.tsx` → `inspector/` (props-редактор = inspector-поля)
- `controllers/WebStudioWelcome.tsx` → `welcome/`
- Перенести соответствующие тесты: `controllers/__tests__/WebStudioProps.test.tsx` → `inspector/__tests__/` (и др. если есть).
- Удалить `src/controllers/index.ts` и саму директорию `src/controllers/`.
- `src/capsule.ts` — импорты Tree/Info/Props/Welcome теперь из их папок.

Имя connected-компонента и точный filename внутри папки — на твоё усмотрение (главное: папка самодостаточна, presentation остаётся stateless и тестируемой отдельно).

## C. `providers/` — провайдер студио

- Создать `src/providers/`.
- Перенести `controllers/WebStudioCreatorRoot.tsx` → `src/providers/StudioProvider.tsx`. Экспорт переименовать (напр. `StudioProvider`). Тело пока то же — `<DnDProvider showDefaultOverlay>{children}</DnDProvider>`; это будущий дом для всей под-капотной обвязки студио (движок + событийный seam), но в этом брифе функционал НЕ расширяем.
- `src/capsule.ts` — заменить регистрацию `CreatorRoot: WebStudioCreatorRoot` → `Provider: StudioProvider`. Обновить докстринг (`WebStudio.Provider`).

---

## App-side companion-правки (делает architect, НЕ ты)

Эти правки в `apps/playground/` после твоего package-коммита (чтобы не оставить битые рефы):
- `widgets/studio/inspector.tsx` — убрать `<WebStudio.CanvasStyle />`.
- `pages/workspace/web-studio/index.tsx` — `<WebStudio.CreatorRoot>` → `<WebStudio.Provider>`.

Тебе их трогать НЕ надо — просто знай, что app временно сломан между твоим и architect'овым коммитом (норм, одна ветка).

---

## Verify (перед commit)

- `pnpm --filter @capsuletech/web-studio test` — зелёный (минус удалённые canvas-тесты).
- `pnpm --filter @capsuletech/web-studio typecheck` (или `pnpm nx run @capsuletech/web-studio:typecheck`) — 0 ошибок.
- `pnpm --filter @capsuletech/web-studio build` — собирается.
- Проверь grep'ом, что в `packages/web/studio/src` не осталось ссылок на `controllers/`, `canvas-frame`, `canvas-style`, `WebStudioCanvas`, `WebStudioCreatorRoot`.

В отчёте architect'у верни: список тронутых файлов + последние строки вывода test/typecheck/build (не пересказ — реальный хвост).

## Готово =
структурно чисто (нет `controllers/`, нет канваса, есть `providers/WebStudio.Provider`), тесты/typecheck/build зелёные, поведение остальных модулей не изменилось.
