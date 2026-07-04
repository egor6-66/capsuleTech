---
title: web-ui — active-link состояние Button в контракте (снять raw-классы из learn shellNavigation)
status: ready
audience: owner-сессия `claude-scope -Scope ui` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [042]
---

# Контекст (ревью user 2026-07-04)

`apps/learn/src/shapes/shellNavigation.tsx:23` — гигантская raw-class строка
(`aria-[current=page]:bg-primary …`) для подсветки активного пункта навигации.
Канон: **классы на app-уровне запрещены**; не хватает пропса → расширяем
контракт компонента. Все прокидываемые пропсы должны быть в contract'ах —
иначе их не видит studio-инспектор.

# Scope (packages/web/kit/ui)

1. Button: состояние «активная ссылка» становится частью компонента.
   Форма — на вкус owner'а, кандидаты:
   (а) встроить `aria-current=page`-стили в CVA-варианты Button (все Button-as-Link
   в nav подсвечиваются автоматически — ноль новых пропсов); ЛИБО
   (б) проп `current?: boolean` / вариант `nav`. Критерий выбора: без raw-классов
   у потребителя и без сюрпризов для существующих Button.
2. Обновить `button.contract.ts` (+ README) — новое поведение/проп описаны,
   studio-инспектор его видит.
3. Токены существующие (Token set FROZEN): использовать `primary`/`primary-foreground`
   как в текущей строке — новых токенов не заводить.
4. Тесты: активное состояние рендерит акцент, неактивное — нет.

# После мержа (зона apps, отдельный мини-фикс)

`shapes/shellNavigation.tsx` (learn) и зеркальная навигация playground: строка
классов удаляется, включается контрактный механизм. Playground-зеркало
проверить тем же коммитом owner-apps.

# Acceptance

`pnpm --filter @capsuletech/web-ui test` зелёные; build (dist!); biome 0;
contract+README обновлены.
