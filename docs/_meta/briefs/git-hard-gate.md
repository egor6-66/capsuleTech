# Бриф: hard-gate на git/gh операции через harness hooks

**Статус:** draft, ожидает реализации
**Owner:** architect (главный) — это shared infra (`.claude/settings.json`), не owner-зона пакета
**Дата:** 2026-06-20
**Связанные memory:** `feedback_no_branch_switch_shared_tree`, `feedback_parallel_bg_agents_share_git`, `feedback_agents_commit_only_user_pushes`, `feedback_agent_hook_block_escalate`

---

## Контекст

2026-06-20 — инцидент на shared working tree. Три agent'а работали параллельно. Один сделал `git switch` на другую ветку без координации, второй потом переключил обратно, работа третьего размазалась по двум веткам, итог — мусор в коммитах + конфликты, ручной разбор.

Канон уже существует на промпт-уровне (см. memory выше) — но agent под нагрузкой задачи его игнорит. Промпт = soft-gate, недостаточно. Нужен hard-gate на уровне харнесса, который физически режет запрещённые команды независимо от того, помнит agent правило или нет.

Это **не** решается обновлением system-prompt'ов агентов — пробовали, не работает (см. этот же инцидент). Решается только PreToolUse-хуком.

---

## Цель

В `.claude/settings.json` поставить PreToolUse-хук на Bash, который перехватывает любые git/gh-команды и блокирует write-операции с понятным сообщением, гонящим в эскалацию (architect/user), а не в retry-loop.

Хук режет **всех** одинаково — включая architect'а. Это фича, не баг: architect получает то же блокирующее сообщение и осознанно решает (либо делает сам в чистом контексте, либо вызывает user'а). Никаких whitelist по subagent_type.

---

## Скоуп — что РЕЖЕМ

PreToolUse → возврат с block + explanation:

- `git switch <branch>` (любое переключение HEAD)
- `git switch -c <branch>` (создание+переключение)
- `git checkout <branch>` (deprecated форма switch'а, но agent'ы её используют)
- `git checkout -b <branch>`
- `git push` во всех формах (с флагами, на upstream, tags, force)
- `git merge <ref>`
- `git rebase` (любые формы; интерактивный итак запрещён CLAUDE.md)
- `git reset --hard`, `git reset --keep`
- `git branch -D|-f|-m` (удаление/перенос/переименование)
- `git worktree add|remove` (worktree-операции — только architect, и тоже через ручное снятие гейта)
- `gh pr create`
- `gh pr merge`
- `gh pr close`

## Скоуп — что ПУСКАЕМ

Read-only / staging в пределах своего worktree:

- `git status`, `git log`, `git diff`, `git show`, `git blame`, `git rev-parse`, `git ls-files`, `git config --get`, `git remote -v`
- `git add`, `git restore --staged`, `git stash push|pop|list|show|drop`
- `git commit` (включая `-m`, `--message`, `--allow-empty` — НЕ режем; agent'ы коммитят в свой worktree, это канон `feedback_agents_commit_only_user_pushes`)
- `git fetch` (read-only обновление)
- `git pull --ff-only` (безопасное обновление, не переписывает работу)
- `git checkout -- <path>`, `git checkout <sha> -- <path>` — restore файлов, НЕ смена HEAD
- `gh pr view`, `gh pr list`, `gh pr diff`, `gh api` (read-only)

**Открытый вопрос:** `git commit --amend` — резать или нет? Аргумент «за»: amend на published HEAD ломает соседям; аргумент «против»: уместен в local-only коммите перед push (которого agent всё равно не делает). Решение по умолчанию — **НЕ резать `--amend`**, потому что push заблокирован отдельно, реального вреда нет. Если на практике начнёт мешать — догадим в v2.

---

## Hook-message (формат)

Когда блок срабатывает, agent должен получить текст вида:

```
❌ Команда `<полная_команда>` заблокирована harness-хуком.

Причина: смена HEAD / публикация / переписывание истории на shared `.git` запрещена для subagent'ов.
Несколько agent'ов работают параллельно в этом worktree; неконтролируемая смена ветки или push
размазывает работу соседей.

Действие: STOP. Не пытайся обойти (через `bash -c`, `&&`, кавычки — хук видит полную команду).
Верни state главному (architect). Architect либо сделает операцию сам, либо выдаст тебе отдельный
worktree, в котором смена HEAD безопасна.
```

Тон важен: явно «STOP, не retry», явно «обход бесполезен», явно «эскалируй». Это снимает попытки workaround (см. `feedback_agent_hook_block_escalate`).

---

## PostToolUse audit-tail

Дополнительная мера на «никто не заметил» (из текущего инцидента — переключение прошло мимо всех).

PostToolUse-хук на успешный `git commit`: дописывает в output одну строку формата:

```
[git-audit] commit <short-sha> on branch <current-branch>
```

Цель: в transcript'е architect'а сразу видно, на какую ветку лёг коммит. Расхождение «должен был коммитить в X, а лёг в Y» ловится в момент, а не через час по конфликтам.

Дёшево (один `git rev-parse`), один раз на коммит, не на каждый Bash.

---

## Что НЕ в скоупе

- ❌ Изменение system-prompt'ов agent'ов (`packages/**/.claude/agents/*` / `.claude/agents/*`) — промпт оставляем как есть, hook независимый слой
- ❌ Автоматизация worktree-создания (отдельная задача, обсуждать позже)
- ❌ Whitelist по subagent_type или actor — режем всех одинаково
- ❌ Кастомные команды-обёртки типа `safe-git switch` — нет, просто блок

---

## Гочи реализации

1. **Regex word-boundary.** Паттерн `git\s+switch` поймает `git switch main` и `git  switch  main`, но НЕ должен ловить мифический `git switchconfig`. Anchor: `^\s*git\s+switch(\s|$)`.
2. **`git checkout -- <file>` НЕ резать.** Это restore рабочей копии, безопасно. Regex для checkout должен отличать `git checkout <branch>` от `git checkout -- <path>` и `git checkout <sha> -- <path>`. Простейший подход: если в команде есть ` -- ` — пускаем; иначе — режем.
3. **`bash -c "git switch ..."`.** Хук видит полную bash-команду целиком, в т.ч. содержимое `-c`. Regex должен матчить подстроку, не только начало строки.
4. **Длинные команды с `&&`.** `git status && git switch foo` — хук видит обе. Если запрещённая команда хотя бы одной частью присутствует — блок.
5. **`gh api repos/.../merges` или `gh api ... -X POST`.** Это запасной канал для merge/PR-операций. По-хорошему режем и его, но это сложно (gh api универсален). Vариант v1: оставляем, надеемся на canon; если начнут злоупотреблять — догадим pattern в v2.
6. **PostToolUse audit не должен валить exit-code commit'а.** Хук читает результат, дописывает строку, всегда возвращает success.

---

## Deliverables

1. **Diff по `.claude/settings.json`** — добавление `hooks` блока с PreToolUse и PostToolUse правилами. Regex-паттерны из секций выше.
2. **5-7 строк в `CLAUDE.md`** в секции `## 🚨 POLICY` (или подсекции про git) — короткая запись «hook X режет Y, эскалируй если нужно Z». Цель: будущий canon-violation объясним («hook сработает, не пытайся обойти»).
3. **Smoke-проверка в PR description:**
   - `git switch foo` → block ✅
   - `git push` → block ✅
   - `gh pr create -t test` → block ✅
   - `git status` → pass ✅
   - `git commit -m test` → pass ✅, audit-line присутствует
   - `git checkout -- README.md` → pass ✅
   - `bash -c "git switch foo"` → block ✅ (проверка что обход через -c не работает)

---

## Verification

После merge — две сессии параллельно (architect + один owner-agent), оба пробуют `git switch` независимо. Обе должны получить блок. Architect руками снимает блок (правит settings.json в отдельной ветке через user'а) на момент когда реально нужно переключиться — это редкий случай, ок ручной workflow.

Если за неделю после merge не случится ни одного инцидента «agent уехал на чужую ветку» — гейт работает. Если случится — разбираем как именно обошли, догадим pattern.
