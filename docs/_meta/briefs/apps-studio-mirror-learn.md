# Бриф: apps/studio — зеркало apps/learn (структура/канон эталона), под домен studio

**Зона:** owner apps-studio (`claude-scope -Scope apps-studio`). Правишь ТОЛЬКО `apps/studio/`. Коммить scope-тегом `apps-studio`, **НЕ пушить** — push/merge architect в конце волны ([[feedback_agents_commit_only_user_pushes]]).

**Перед стартом прочитай эталон рядом и держи открытым** — раскладываешь **буквально по нему** ([[feedback_mirror_means_literal_mirror]]):
- `apps/learn/capsule.app.ts`, `apps/learn/src/features/{app,library}.tsx`, `apps/learn/src/pages/_workspace/{index,_index}.tsx` + `.../library/index.tsx`, `apps/learn/src/widgets/{header,navigation}.tsx`.
- Прогони `cd apps/studio; pnpm capsule dev` (или как обычно) — baseline, что грузится сейчас.

> 🆕 **ВАЖНО — навигация переехала (learn-волна nav-consolidation, СВЕЖЕЕ):** в learn БОЛЬШЕ НЕТ `apps/learn/src/shapes/shellNavigation.tsx` — main-nav стал пакетным `Learn.Nav.Main`, app лишь монтит `<Learn.Nav.Main/>` в хедере и роутит generic `onSegmentNavigate`. **НЕ зеркаль эту часть буквально** — у студии другая топология навигации (см. §E ниже).

---

## Инвариант (канон эталонного аппа)

> **`apps/learn` = эталон. Ни одного `import` в слоях** — только глобалы (`WebStudio.*`, `Shell.*`, `Layouts.*`, `Shapes.*`, `Widgets.*`, `Features.*`, `Entities.*`) и `Ui`-примитивы (первый аргумент wrapper'а). Control-flow — `Ui.Flow.*`. Data-плитки — Shape. Типы — из Entity-глобала (`Entities.X.Row`, codegen `$infer`). См. [[feedback_no_imports_in_app]], [[feedback_app_layers_no_imports_shape_for_tiles]], [[reference_widget_store_arg_canon]] (store = 2-й аргумент виджета).

## ⚠️ Что НЕ трогать (осознанное расхождение студии от learn)

Studio — **role-gated тул** (роли designer/developer/devops). **Auth сохраняем целиком:** пакет `@capsuletech/web-auth`, `capsule.app.ts` секции `access`/`auth`, `entities/viewer.tsx`, `endpoints/auth.ts`, `shapes/login.tsx`, auth-композиция логин-формы, `Features.App` guest/authed FSM + `Auth.Events`. learn auth-less — это его специфика, НЕ приводим студию к ней. Зеркалим **структуру и канон**, не контент.

---

## A. Pages — привести к learn shell→section→leaf

У learn: `_workspace/index.tsx` = **shell-каркас** (Provider + header + `<Ui.Separator/>` + `<Ui.Outlet/>`), секции = дочерние папки (`library/index.tsx` = section-layout с под-навигацией + свой Outlet), листья = `explorer.tsx`/`[param].tsx`, дефолт секции = `_index.tsx`.

Сейчас у студии `_workspace/index.tsx` = сразу Matrix-layout web-studio (shell и секция слиты), + вперемешку `store/index.tsx`, `store.tsx`, `creator.tsx`. **Расслоить по learn:**

```
pages/_workspace/
  index.tsx            ← SHELL: <WebStudio.Provider canvasUrl>… <Widgets.Header/> + <Ui.Separator/> + <Ui.Outlet/>
                         (тонкий каркас ВСЕХ секций workspace: web-studio · devops · docs)
  _index.tsx           ← welcome-фолбэк shell'а (напр. <WebStudio.Welcome/> или лаунчер разделов)
  web-studio/
    index.tsx          ← SECTION-layout: Matrix app-shell с панелями студии + под-нав (store/creator) + <Ui.Outlet/>
    _index.tsx         ← дефолт секции (напр. редирект/приветствие web-studio)
    store.tsx          ← leaf: Matrix со слотами store-режима (палитра/канвас/инспектор/инфо)
    creator.tsx        ← leaf: Matrix со слотами creator-режима (дерево/канвас/инспектор)
  devops/index.tsx     ← плейсхолдер-секция (роль devops) — тонкая, как learn-заглушки
  docs/index.tsx       ← docs-секция (доступна всем)
```

Точные слоты Matrix — из текущих `widgets/studio/*` (Header/ComponentsPalette/Inspector/Info/Tree/Canvas), их НЕ переписывай, только перевесь по секциям/листьям. Убери дубли (`store/index.tsx` vs `store.tsx` — оставь одну форму по learn-конвенции; leaf = файл, не папка-с-index, если под ним нет своих детей).

`meta.can` на layout-роутах сохрани (гейт роли — студийная специфика).

## B. features/ — root App + доменные стоки (по learn)

- `features/app.tsx` — root App-фича. **Оживи роутинг** (сейчас все `router.goTo` закомментированы — мёртвая навигация): по образцу learn `features/app.tsx` формула `onSegmentNavigate`/`onNavigate` → реальный `router.goTo`. guest→`/login`, authed→workspace-home, `onNavigate(segment)`→путь секции/режима. **Пути должны сойтись** с `shapes/shellNavigation` и структурой папок из §A (сейчас рассогласованы). App-wide концерны (навигация, auth-FSM) — тут; домен-специфику не тащить.
- Доменные фичи-стоки (как learn `features/library.tsx` — тонкий `initial:'idle', states:{idle:{}}`, сток баблинга под будущие события раздела): заведи, если у секции web-studio есть/будут доменные события; если событий нет — не плоди пустышки ([[package-anatomy]] «слот только под содержимое»).

## C. widgets/ — header + generic navigation

- `widgets/header.tsx` — уже есть (`widgets/studio/header.tsx`?). Сверь с learn `widgets/header.tsx`: `<Shell.Header>` + `<Shapes.ShellNavigation/>` + `<Shell.Header.Menu>` (Appearance + ModeToggle resize/dnd — у студии канвас редактируемый, ModeToggle УМЕСТЕН). Ноль import'ов.
- `widgets/navigation.tsx` — **добавь** generic-контейнер под-навигации (буквально learn-версия: `<Ui.Layout.Flex justify="center" align="center" p={1}>{props.children}</Ui.Layout.Flex>`) — chrome для под-нава store/creator (`<Widgets.Navigation><WebStudio.Nav.Main/></Widgets.Navigation>`, ключ из package nav-consolidation, см. §E).
- `widgets/studio/*` — композиция панелей студии, оставляем; проверь ноль import'ов и store 2-м аргументом где нужен store.

## D. Мусор-scaffold — снести

`views/hello.tsx`, `widgets/placeholder.tsx` — дефолты create-app, learn их не имеет. **Сначала grep-проверь, что не зареференсены** (страницы/капсула), потом удали. `widgets/loginForm.tsx` / `shapes/login.tsx` — НЕ мусор (auth-композиция), оставь.

## E. Навигация — асимметрия с learn (важно, читать целиком)

Learn перевёл ВСЮ навигацию в пакет (`Learn.Nav.Main`), потому что его app-nav = секции learn-пакета. **У студии топология другая — ДВА яруса навигации:**

1. **App-level nav** (`Web Studio / DevOps / Docs`) — **ОСТАЁТСЯ в аппе** как `shapes/shellNavigation.tsx` (Shape). Он охватывает РАЗНЫЕ инструменты (studio/devops/docs), role-gated через `can` — это **app-owned** знание, НЕ концерн web-studio-пакета. НЕ переноси его в пакет. Это осознанная асимметрия с learn (там app-nav уехал в пакет, тут — нет). Монтируется в `widgets/header.tsx` через `<Shapes.ShellNavigation/>` (как сейчас) — **сохрани**.
2. **Section-level nav** web-studio (`store / creator` модусы) — **пакетный**, приходит из web-studio nav-consolidation как **`WebStudio.Nav.Main`** (заменил `WebStudio.Navigation`). Монтируется под-навом в section-layout `pages/_workspace/web-studio/index.tsx` через `<Widgets.Navigation><WebStudio.Nav.Main/></Widgets.Navigation>`.

**Событие (сменилось пакетом):** `WebStudio.Nav.Main`/`WebStudio.Welcome` теперь эмитят generic **`onSegmentNavigate { nav:'web-studio', segment }`** (было бесповское `onNavigate: segmentId`). В `features/app.tsx`:
- переименуй хендлер `onNavigate` → **`onSegmentNavigate`**; роутинг `nav==='web-studio' → /workspace/web-studio/${segment}` (`target.payload.segment`);
- тип события — из `Shell.SegmentNav.Events` (как learn), НЕ из `WebStudio.Navigation.Events` (тот удалён в пакете);
- app-level nav (shellNavigation) роутит по-своему (декларативные `to` в Shape либо свой хендлер — как у тебя сейчас), это отдельный ярус.

> Порядок: package-бриф `web-studio-nav-consolidation.md` даёт `WebStudio.Nav.Main` + новое событие ПЕРВЫМ; твой app-коммит — после (иначе `onNavigate`-хендлер повиснет). Одна волна.

---

## Verify (перед commit)

- `cd apps/studio; pnpm capsule dev` — грузится, роуты резолвятся (workspace-shell → web-studio → store/creator; login-флоу; devops/docs секции).
- Ноль compliance import-violations в слоях (`app-package-import`/`disallowed-import` — structural, валят CI). Проверь dev-стрим / `pnpm compliance:check` если доступен.
- Grep: в `apps/studio/src/**` нет `import` в pages/widgets/shapes/features (кроме типов, если неизбежно — но эталон = ноль).
- ⚠️ **Живой eyeball `:8080/studio/`** (gateway уже заведён architect'ом) — но браузер-верификация финально за architect/user; в отчёте пометь, что требуется.

В отчёте architect'у: тронутые/удалённые файлы, финальная структура `pages/`, хвост dev/compliance, список оставшихся вопросов.

## Готово =
`apps/studio` повторяет скелет и канон `apps/learn` (shell→section→leaf pages, features app+стоки, widgets header+navigation, ноль import'ов), auth сохранён, app-level nav (`shapes/shellNavigation`) на месте, section-nav через `WebStudio.Nav.Main` + `onSegmentNavigate`, роутинг живой, scaffold-мусор убран. Финальный визуал — за architect/user.
