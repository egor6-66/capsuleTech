---
title: apps/learn — раздел Lessons на пакетные Learn.Lessons.* блоки
status: ready ПОСЛЕ learn-lessons-blocks.md (нужны блоки + rebuild dist web-learn)
audience: owner-сессия `claude-scope -Scope apps` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [032, 069]
---

# Контекст

Пакет отдаёт `Learn.Lessons.{List,View}` (store внутри пакета). Скаффолд
страниц `pages/_workspace/lessons/*` сейчас — копипаст library (контент и
комменты врут) — приводим к реальной форме v1.

# Scope (только apps/learn)

1. **Форма v1** (проще library — под-навигация explorer/collections разделу
   НЕ нужна):
   - `lessons/index.tsx` (layout) → просто `<Ui.Outlet/>` (или снести layout,
     если роутер позволяет плоско — по месту);
   - `lessons/_index.tsx` → композиция: main = `<Learn.Lessons.List/>`,
     деталь = `<Learn.Lessons.View/>` (раскладка по образцу library-explorer:
     Matrix main+rightBar ЛИБО вертикальный Flex — согласовать глазами с user
     на живой странице, не гадать);
   - копипаст-страницы `lessons/explorer.tsx`, `lessons/collections.tsx` —
     СНЕСТИ (это артефакты скаффолда);
   - комменты страниц — переписать под lessons (сейчас врут «/library»).
2. **Доменная фича** `features/lessons.tsx` (канон feedback_app_feature_scopes):
   ловит `Learn.Lessons.List.Events.onLessonSelect` — на v1 достаточно
   no-op/лога ИЛИ синка сегмента в URL, если решите с user'ом; монтируется
   обёрткой в lessons-layout. `onSpeak` НЕ трогать — уже баблится в root App
   (плеер там, app-глобальный концерн).
3. **Пререквизит:** `pnpm --filter @capsuletech/web-learn build` (dist!) +
   рестарт dev `--force` (registry regen на новые блоки).

# Acceptance

build+biome 0; live `:8080/learn/lessons` (бэки learn :8003 + lang :8002
СВЕЖИЕ — lang рестартнуть, стухший без lessons-роутов!): список уроков виден,
клик открывает урок (концепт-проза → правило-таблицы → дрилл), ввод ответа
в дрилл даёт ✅/хинт/мимо, «показать ответ» работает, 🔊 на словах дрилла
играет.
