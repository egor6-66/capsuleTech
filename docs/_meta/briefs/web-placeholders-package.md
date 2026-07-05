---
title: web-placeholders — плейсхолдеры как ДАННЫЕ (схемы web-renderer) + Placeholders.* регистрация
status: ready
audience: owner-сессия `claude-scope -Scope placeholders` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [032, 033]
---

# Контекст (решение user 2026-07-04)

Ходовые плейсхолдеры (404, ошибка, «доступ только для комьюнити», «виджет
недоступен») нужны всем аппам. Решение: НЕ компонент-пакет, а **пакет данных** —
схемы `web-renderer` (`ISchema`) + тонкие блоки-обёртки. Это линия
renderer-конвергенции: плейсхолдеры = первый контент, который позже будет
редактироваться студией (флоу «document → пресет») и первый потребитель
будущего value-binding.

Bootstrap: `packages/web/domain/placeholders/package.json` создан architect'ом
(scope `placeholders` активен). tsconfig.base paths добавлены (root + /capsule).
`optimizeDeps.exclude` — параллельный бриф vite-builder
(`builders-exclude-web-placeholders.md`); до его мержа dev-верификация в аппе
может спотыкаться о prebundle — юнит-тестов пакета это не касается.

# Scope (packages/web/domain/placeholders)

**Анатомия = эталон learn** (канон 2026-07-04): блоки-папки, `capsule.ts`,
cross-cutting в `core/` (здесь может не понадобиться — не заводить пустым).

1. **Каркас пакета:** дозаполнить package.json (exports index+capsule, deps:
   `@capsuletech/web-renderer`, `@capsuletech/web-core`, web-ui по факту),
   lib-builder build, vitest — по образцу соседей domain-зоны (auth/shell).
   `private` снять когда build/test зелёные (группа web_base).
2. **Схемы-данные** `schemas/` — 4 модуля `ISchema` (типы из web-renderer):
   `notFound` (404 + кнопка «на главную»), `error` (что-то пошло не так +
   «повторить»), `accessDenied` (нужен вход/роль + кнопка «войти»),
   `widgetUnavailable` (компактный, встраиваемый вместо упавшего виджета).
   - Только резолвящиеся типы kit'а (`ui.Layout.Flex`, `ui.Typography`,
     `ui.Button`, `ui.Card`, …) — канон guard'а manifest-path-invariant.
   - Тексты фиксированные (value-binding = гэп renderer'а, фаза 2 — НЕ изобретать
     свою подстановку).
   - Визуал — только токены/пропсы из манифестов (никаких raw-классов в props).
3. **Блоки** `Placeholders.{NotFound,Error,AccessDenied,WidgetUnavailable}`:
   обёртка `<Renderer.View schema registry mode="controlled">`; клики по
   интерактивным узлам (`IInteraction`) → именованные события через
   `useEmitOptional` (ADR 032): `onHome`, `onRetry`, `onLogin`. Phantom
   `__events` на каждом блоке.
   - **Registry-шов:** собрать `{ ui: … }` как канвас-апп (`{ui: Ui}`). Если у
     пакета нет чистого способа получить собранный Ui-неймспейс (публичный
     экспорт ui-kit из web-core) — **STOP + surface architect'у** (будет
     мини-бриф owner-core), НЕ тащить самосборный реестр копией.
4. **capsule.ts** — `defineCapsuleModule({ name: 'Placeholders', components: … })`.
5. **Тесты:** каждая схема рендерится (jsdom, fake-registry допустим), клик по
   интерактивному узлу эмитит своё событие, схемы типизируются против ISchema
   без cast'ов.
6. **OWNERSHIP.md** — публичный API + принцип «пакет данных, редактор — студия
   (будущее)».

# Что НЕ делаем

- Value-binding/параметризацию (фаза 2, зона web-renderer).
- Студио-интеграцию «edit→save» (фаза 3).
- Никаких «своих» компонентов — только схемы + Renderer.

# Acceptance

`pnpm --filter @capsuletech/web-placeholders test|build` зелёные; biome 0;
tsconfig paths при добавлении новых субпатов — эскалировать architect'у (root —
его зона).
