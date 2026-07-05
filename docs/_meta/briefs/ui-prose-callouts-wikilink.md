---
title: web-ui — Prose: стили callout-блоков (4 типа) + wikilink-акцент
status: ready ПОСЛЕ docs-markdown-callouts-wikilinks.md (согласованные классы)
audience: owner-сессия `claude-scope -Scope ui` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [042]
---

# Scope (packages/web/kit/ui — примитив Prose)

renderMarkdown теперь выдаёт семантику — Prose её красит (токены, Token set
FROZEN, тёмная тема автоматически):

1. `.callout` — карточка-блок (рамка/фон из токенов) с вариантами по
   `.callout-info|tip|warning|note` (акцент цветом рамки/заголовка;
   status-токены существующие). `.callout-title` — жирный, с типовой
   иконкой из kit Icons (info/lightbulb/alert/note — по наличию в наборе,
   новые иконки НЕ заводить без нужды).
2. `.wikilink` — стиль внутренней ссылки: акцент primary, underline on hover,
   cursor pointer (это `<a>` без href — кликом управляет потребитель).
3. Story: markdown с двумя callout'ами + wikilink; тесты рендера классов.

# Acceptance
test/build/biome зелёные; dist пересобран.
