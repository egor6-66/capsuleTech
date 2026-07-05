---
title: web-docs — renderMarkdown: Obsidian-callouts + wikilinks → семантическая разметка
status: ready
audience: owner-сессия `claude-scope -Scope docs` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: []
---

# Контекст

Контент учителя — Obsidian-markdown. Два конструкта не рендерятся:
1. Callout `> [!info] Заголовок` → сейчас текст «[!info]…» как есть.
2. Wikilink `[[grammar-verbs-tenses]]` / `[[id|подпись]]` → сейчас голый текст;
   а нам нужны живые переходы между доками (решение user).

Канон разделения: web-docs выдаёт СЕМАНТИКУ (классы/data-атрибуты), стили —
Prose (web-ui, параллельный бриф), поведение кликов — потребитель (web-learn).

# Scope (packages/web/docs — renderMarkdown)

1. **Callouts**: blockquote, начинающийся с `[!type]` (type ∈ info|tip|warning|
   note; unknown → note) →
   `<div class="callout callout-<type>"><p class="callout-title">Заголовок</p>…тело…</div>`.
   Заголовок = остаток первой строки (может быть пустым). Вложенный markdown
   тела рендерится как обычно.
2. **Wikilinks**: `[[id]]` и `[[id|label]]` →
   `<a class="wikilink" data-ref="id">label|id</a>` (БЕЗ href — резолв пути
   не зона рендерера; потребитель вешает клик по data-ref).
3. Обычный markdown не регрессирует (таблицы/код/списки). Тесты на оба
   конструкта + смесь + «[[» внутри code-блока НЕ трогается.

# Acceptance
test/build/biome зелёные; dist пересобран (потребители — web-learn/studio Info).
