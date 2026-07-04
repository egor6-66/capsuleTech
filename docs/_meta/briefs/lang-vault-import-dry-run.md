---
title: backend/lang — vault_import --check (dry-run самопроверки контента) + игнор _templates/
status: ready
audience: owner-сессия `claude-scope -Scope backend-lang` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [069]
---

# Контекст

Round-3 показал класс проблем «контент не в том формате узнаётся только при
импорте у owner'а». Системный фикс (решение user): учитель/user гоняют
валидацию САМИ до передачи раунда — dry-run, ничего не пишет, показывает все
ошибки разом.

# Scope (backend/lang)

1. `vault_import` флаг `--check`: полный прогон валидации (words SenseIn +
   lessons-граф, ВСЕ файлы — не fail-fast) БЕЗ записи в БД. Вывод — тот же
   отчёт + список reject'ов `файл :: причина` (человекочитаемо, как сейчас).
   Exit code 0 = чисто, 1 = есть reject'ы (скриптуемо).
2. Резолв `words[]`/ссылок в check-режиме: против БД + контента текущего
   прогона (слово из words/*.yaml того же раунда считается существующим).
3. Игнорировать `_templates/` и `_*`-папки vault (учитель может завести
   шаблоны у себя).
4. README: команда самопроверки одной строкой (для user'а).
5. Тесты: check не пишет; смешанная фикстура (валид+невалид) даёт полный
   список причин; exit-code.

# Acceptance

pytest+ruff зелёные; live: `uv run python -m capsule_lang.vault_import D:\learn\lang --check`
на текущем vault — отчёт без записи.
