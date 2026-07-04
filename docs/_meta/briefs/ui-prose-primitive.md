---
title: web-ui — примитив Prose: типографика для rendered-markdown (заголовки/списки/ТАБЛИЦЫ) на токенах
status: ready (параллельно с чем угодно — зона свободна)
audience: owner-сессия `claude-scope -Scope ui` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [042]
---

# Контекст

`renderMarkdown` (web-docs) отдаёт голый HTML — Tailwind preflight сбрасывает
стили, и проза/справочники выглядят кашей (learn концепты/правила, README в
studio Info — один и тот же гэп). Типографика = зона kit'а.

# Scope (packages/web/kit/ui)

1. Примитив **`Prose`**: контейнер, стилизующий ВЛОЖЕННЫЙ html/children:
   h1-h4 (иерархия размеров/отступов), p, ul/ol/li, **table/th/td (границы,
   зебра или線 — в правилах граматики таблиц много, это главный кейс)**,
   code/pre, blockquote, a, strong/em, hr. Всё на существующих токенах
   (Token set FROZEN), тёмная тема через токены автоматически.
2. Форма: CVA-стили потомков через селекторы (`[&_h2]:…` паттерн kit'а)
   ЛИБО css-файл пакета — на вкус owner'а, критерий: потребитель пишет
   `<Prose innerHTML={html}/>` или `<Prose>{children}</Prose>` и НИЧЕГО больше.
3. Пропсы: `size?: 'sm'|'md'` (компакт для панелей/Info) — не раздувать.
4. Contract+manifest+README+story (пример с таблицей!), тесты рендера.

# Acceptance

test/build/biome зелёные; story с markdown-таблицей выглядит как документ,
не как каша; dist пересобран.
